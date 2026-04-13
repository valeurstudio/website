import { createHash } from 'crypto';
import { parse } from 'node-html-parser';
import { CATEGORY_WEIGHTS, CATEGORY_LABELS, SCORE_BANDS, CACHE_TTL_MS } from './_config.js';
import { runSeoChecks, runPerfChecks, runContentChecks, runUxChecks, runConversionChecks, runTechnicalChecks } from './_checks.js';

// ─── URL normalisation ───────────────────────────────────────────────────────

export function normaliseUrl(raw) {
  let url = raw.trim().toLowerCase();
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function hashContent(html) {
  return createHash('sha256').update(html).digest('hex');
}

// ─── In-memory cache ─────────────────────────────────────────────────────────
// Works within a single serverless invocation / warm instance.
// Does not persist across cold starts in production.

const cacheStore = new Map();

function getCached(normUrl, contentHash) {
  const entry = cacheStore.get(normUrl);
  if (!entry) return null;
  if (entry.contentHash !== contentHash) return null;
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) { cacheStore.delete(normUrl); return null; }
  return entry.result;
}

function setCached(normUrl, contentHash, result) {
  cacheStore.set(normUrl, { result, contentHash, storedAt: Date.now() });
}

// ─── Scoring helpers ─────────────────────────────────────────────────────────

function getScoreLabel(score) {
  if (score === null) return null;
  for (const band of SCORE_BANDS) {
    if (score >= band.min) return band.label;
  }
  return 'Needs Attention';
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };

function assignPriority(sub) {
  if (sub.status === 'unavailable' || sub.score === null) return { ...sub, priority: null };
  if (sub.score === sub.max) return { ...sub, priority: 'none' };
  const halfMax = Math.floor(sub.max / 2);
  if (sub.score === 0 && sub.max >= 20) return { ...sub, priority: 'critical' };
  if (sub.score === 0 && sub.max >= 10) return { ...sub, priority: 'high' };
  if (sub.score <= halfMax && sub.max >= 20) return { ...sub, priority: 'high' };
  if (sub.score <= halfMax && sub.max >= 10) return { ...sub, priority: 'medium' };
  return { ...sub, priority: 'low' };
}

function computeCategoryScore(subcriteria) {
  const available = subcriteria.filter(s => s.status === 'scored' && s.score !== null);
  if (available.length === 0) return null;
  const earned = available.reduce((sum, s) => sum + s.score, 0);
  const maxAvail = available.reduce((sum, s) => sum + s.max, 0);
  return maxAvail === 0 ? null : Math.round((earned / maxAvail) * 100);
}

function buildCategory(key, subcriteria) {
  const scored = subcriteria.map(assignPriority);
  const score = computeCategoryScore(scored);
  return { label: CATEGORY_LABELS[key], score, scoreLabel: getScoreLabel(score), weight: CATEGORY_WEIGHTS[key], subcriteria: scored };
}

function computeOverallScore(categories) {
  const available = Object.entries(categories).filter(([, c]) => c.score !== null);
  if (available.length === 0) return null;
  const totalWeight = available.reduce((sum, [key]) => sum + CATEGORY_WEIGHTS[key], 0);
  const weighted = available.reduce((sum, [key, cat]) => sum + cat.score * CATEGORY_WEIGHTS[key], 0);
  return Math.round(weighted / totalWeight);
}

function sortByPriority(a, b) {
  const pa = PRIORITY_ORDER[a.priority ?? 'low'] ?? 3;
  const pb = PRIORITY_ORDER[b.priority ?? 'low'] ?? 3;
  if (pa !== pb) return pa - pb;
  return (b.max - (b.score ?? 0)) - (a.max - (a.score ?? 0));
}

function buildTopIssues(categories) {
  return Object.values(categories)
    .flatMap(c => c.subcriteria)
    .filter(s => s.status === 'scored' && s.score !== null && s.score < s.max && s.priority !== null && s.priority !== 'none')
    .sort(sortByPriority)
    .slice(0, 5);
}

function buildStrengths(categories) {
  return Object.values(categories)
    .flatMap(c => c.subcriteria)
    .filter(s => s.status === 'scored' && s.score !== null && s.score === s.max)
    .sort((a, b) => b.max - a.max)
    .slice(0, 5);
}

function buildPriorityFixes(categories) {
  return Object.values(categories)
    .flatMap(c => c.subcriteria)
    .filter(s => s.status === 'scored' && s.score !== null && s.score < s.max && s.fix !== null && s.priority !== null && s.priority !== 'none')
    .sort(sortByPriority)
    .slice(0, 5);
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ValeurStudioAudit/1.0)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();
  const headers = {};
  res.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
  return { html, headers, statusCode: res.status, finalUrl: res.url };
}

async function fetchPSI(url) {
  const apiKey = process.env.GOOGLE_PSI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PSI_API_KEY not set');
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${apiKey}`;
  let res = await fetch(endpoint, { signal: AbortSignal.timeout(45000) });
  if (!res.ok && res.status >= 500) {
    await new Promise(r => setTimeout(r, 2000));
    res = await fetch(endpoint, { signal: AbortSignal.timeout(45000) });
  }
  if (!res.ok) throw new Error(`PSI API error: ${res.status}`);
  const data = await res.json();
  const audits = data?.lighthouseResult?.audits ?? {};
  const cats = data?.lighthouseResult?.categories ?? {};
  return {
    lcp:         audits['largest-contentful-paint']?.numericValue ?? null,
    cls:         audits['cumulative-layout-shift']?.numericValue ?? null,
    tbt:         audits['total-blocking-time']?.numericValue ?? null,
    ttfb:        audits['server-response-time']?.numericValue ?? null,
    weight:      audits['total-byte-weight']?.numericValue ?? null,
    mobileScore: cats['performance']?.score !== undefined ? Math.round(cats['performance'].score * 100) : null,
  };
}

// ─── Main audit runner ───────────────────────────────────────────────────────

export async function runAudit(rawUrl, ctx) {
  const normUrl = normaliseUrl(rawUrl);

  const [pageDataResult, psiResult] = await Promise.allSettled([
    fetchPage(normUrl),
    fetchPSI(normUrl),
  ]);

  const pageData = pageDataResult.status === 'fulfilled'
    ? pageDataResult.value
    : { html: '', headers: {}, statusCode: 0, finalUrl: normUrl };

  if (psiResult.status === 'rejected') console.error('PSI failed:', psiResult.reason?.message ?? psiResult.reason);
  const psi = psiResult.status === 'fulfilled'
    ? psiResult.value
    : { lcp: null, cls: null, tbt: null, ttfb: null, weight: null, mobileScore: null };

  const pageFailed = pageDataResult.status === 'rejected' || pageData.statusCode === 0;
  const dom = parse(pageData.html);
  const contentHash = hashContent(pageData.html);

  const cached = getCached(normUrl, contentHash);
  if (cached) return cached;

  let seoSubs, contentSubs, uxSubs, convSubs, techSubs;

  if (pageFailed) {
    const unavail = (id, label, max, method) => ({ id, label, score: null, max, method, status: 'unavailable', detail: null, fix: null, priority: null });
    seoSubs = [
      unavail('seo.title',       'Meta Title',             20, 'deterministic'),
      unavail('seo.description', 'Meta Description',       20, 'deterministic'),
      unavail('seo.h1',          'H1 Tag',                 15, 'deterministic'),
      unavail('seo.alt',         'Image Alt Coverage',     15, 'deterministic'),
      unavail('seo.sitemap',     'Sitemap.xml',            10, 'deterministic'),
      unavail('seo.robots',      'Robots.txt',             10, 'deterministic'),
      unavail('seo.canonical',   'Canonical Tag',          10, 'deterministic'),
    ];
    contentSubs = [
      unavail('content.vp',       'Value Proposition Above Fold', 35, 'ai'),
      unavail('content.headline', 'Headline Effectiveness',       30, 'ai'),
      unavail('content.outcomes', 'Customer Outcome Focus',       20, 'ai'),
      unavail('content.clarity',  'Content Clarity',              15, 'ai'),
    ];
    uxSubs = [
      unavail('ux.mobile',    'Mobile Responsiveness', 30, 'deterministic'),
      unavail('ux.a11y',      'Accessibility Baseline', 25, 'deterministic'),
      unavail('ux.nav',       'Navigation Clarity',    25, 'ai'),
      unavail('ux.hierarchy', 'Visual Hierarchy',      20, 'ai'),
    ];
    convSubs = [
      unavail('conv.cta',     'CTA Presence and Effectiveness', 35, 'ai'),
      unavail('conv.trust',   'Trust Signals',                  30, 'ai'),
      unavail('conv.contact', 'Contact Information Visible',    20, 'deterministic'),
      unavail('conv.capture', 'Lead Capture Mechanism',         15, 'deterministic'),
    ];
    techSubs = [
      unavail('tech.https',     'HTTPS',             30, 'deterministic'),
      unavail('tech.headers',   'Security Headers',  25, 'deterministic'),
      unavail('tech.schema',    'Structured Data',   20, 'deterministic'),
      unavail('tech.links',     'Broken Links',      15, 'deterministic'),
      unavail('tech.redirects', 'Redirect Chains',   10, 'deterministic'),
    ];
  } else {
    [seoSubs, contentSubs, uxSubs, convSubs, techSubs] = await Promise.all([
      runSeoChecks(dom, pageData.finalUrl),
      runContentChecks(dom, ctx),
      runUxChecks(dom, psi, ctx),
      runConversionChecks(dom, ctx),
      runTechnicalChecks(pageData, dom),
    ]);
  }

  const perfSubs = runPerfChecks(psi);

  const categories = {
    seo:         buildCategory('seo',         seoSubs),
    performance: buildCategory('performance', perfSubs),
    content:     buildCategory('content',     contentSubs),
    ux:          buildCategory('ux',          uxSubs),
    conversion:  buildCategory('conversion',  convSubs),
    technical:   buildCategory('technical',   techSubs),
  };

  const overallScore = computeOverallScore(categories);

  const result = {
    url: normUrl,
    auditedAt: new Date().toISOString(),
    contentHash,
    overallScore,
    scoreLabel: getScoreLabel(overallScore),
    categories,
    topIssues:     buildTopIssues(categories),
    strengths:     buildStrengths(categories),
    priorityFixes: buildPriorityFixes(categories),
  };

  setCached(normUrl, contentHash, result);
  return result;
}
