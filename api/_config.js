// Audit engine configuration — ported from valeur-studio-audit reference

export const CATEGORY_WEIGHTS = {
  content:     0.25,
  seo:         0.20,
  conversion:  0.20,
  ux:          0.15,
  performance: 0.15,
  technical:   0.05,
};

export const CATEGORY_LABELS = {
  seo:         'SEO & Discoverability',
  performance: 'Page Speed & Performance',
  content:     'Content & Messaging',
  ux:          'User Experience',
  conversion:  'Conversion Optimization',
  technical:   'Technical Health',
};

export const SCORE_BANDS = [
  { min: 80, label: 'Strong' },
  { min: 65, label: 'Acceptable' },
  { min: 50, label: 'Needs Work' },
  { min: 0,  label: 'Needs Attention' },
];

// Performance thresholds (PSI mobile strategy, ms except CLS and weight)
export const PERF_THRESHOLDS = {
  lcp:    { full: 2500,  partial: 4000,  fullScore: 25, partialScore: 15 },
  cls:    { full: 0.10,  partial: 0.25,  fullScore: 20, partialScore: 12 },
  tbt:    { full: 200,   partial: 600,   fullScore: 20, partialScore: 12 },
  ttfb:   { full: 800,   partial: 1800,  fullScore: 20, partialScore: 12 },
  weight: { full: 1e6,   partial: 3e6,   fullScore: 15, partialScore: 9  },
};

export const PERF_FIX = {
  lcp:    { zero: 'Investigate render-blocking resources, large images, or slow server response time to improve LCP.',
            partial: 'LCP is close. Optimize the largest above-fold image or reduce server response time to reach 2.5s.' },
  cls:    { zero: 'Audit layout shifts caused by images without dimensions, injected content, or web font loading.',
            partial: 'CLS is marginal. Add explicit width and height to images and avoid inserting content above existing elements.' },
  tbt:    { zero: 'Reduce JavaScript execution time by splitting bundles, deferring non-critical scripts, and removing unused code.',
            partial: 'TBT is marginal. Defer or remove third-party scripts that block the main thread on load.' },
  ttfb:   { zero: 'Investigate server response time — check hosting tier, database query speed, and CDN configuration.',
            partial: 'TTFB is marginal. Consider adding a CDN or upgrading server tier to reach sub-800ms response.' },
  weight: { zero: 'Compress images, enable lazy loading, and audit third-party scripts to reduce total page size below 1 MB.',
            partial: 'Page weight is marginal. Run images through a compression tool and remove unused CSS or JS to reach 1 MB.' },
};

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const AI_MODEL = 'claude-haiku-4-5-20251001';

export const AI_CRITERIA = {
  'content.vp': {
    label: 'Value Proposition Above Fold',
    max: 35,
    allowedScores: [0, 5, 15, 25, 35],
    systemPrompt: `You are evaluating a website's value proposition above the fold for a website audit. You will receive page content and business context. Return a JSON object ONLY with keys: "score" (integer from the allowed set), "detail" (string, max 120 chars, what you observed), "fix" (string, max 150 chars, specific actionable instruction, or null if score is at maximum). Do not return anything outside the JSON object.

Rubric — score must be exactly one of: 0, 5, 15, 25, 35
- 35: Clear statement of what the business does, who it serves, and the benefit — all visible without scrolling
- 25: Value prop above fold but missing one of those three elements (what/who/benefit)
- 15: Value prop present but requires scrolling to reach
- 5: Vague or generic above-fold copy with no discernible value prop
- 0: No value proposition on the page`,
  },
  'content.headline': {
    label: 'Headline Effectiveness',
    max: 30,
    allowedScores: [0, 12, 22, 30],
    systemPrompt: `You are evaluating a website's headline effectiveness for a website audit. You will receive page content and business context. Return a JSON object ONLY with keys: "score" (integer from the allowed set), "detail" (string, max 120 chars, what you observed), "fix" (string, max 150 chars, specific actionable instruction, or null if score is at maximum). Do not return anything outside the JSON object.

Rubric — score must be exactly one of: 0, 12, 22, 30
- 30: Specific, outcome-oriented headline that speaks directly to the target customer
- 22: Relevant and reasonably strong but generic or feature-focused
- 12: Unclear or describes the business rather than the benefit to the customer
- 0: No meaningful headline present`,
  },
  'content.outcomes': {
    label: 'Customer Outcome Focus',
    max: 20,
    allowedScores: [0, 7, 14, 20],
    systemPrompt: `You are evaluating whether a website's body copy focuses on customer outcomes for a website audit. You will receive page content and business context. Return a JSON object ONLY with keys: "score" (integer from the allowed set), "detail" (string, max 120 chars, what you observed), "fix" (string, max 150 chars, specific actionable instruction, or null if score is at maximum). Do not return anything outside the JSON object.

Rubric — score must be exactly one of: 0, 7, 14, 20
- 20: Body copy consistently frames benefits in terms of customer outcomes
- 14: Mix of outcomes and features with outcomes dominant
- 7: Primarily feature-focused with little customer benefit language
- 0: Entirely feature or process focused`,
  },
  'content.clarity': {
    label: 'Content Clarity',
    max: 15,
    allowedScores: [0, 5, 10, 15],
    systemPrompt: `You are evaluating a website's content clarity and readability for a website audit. You will receive page content and business context. Return a JSON object ONLY with keys: "score" (integer from the allowed set), "detail" (string, max 120 chars, what you observed), "fix" (string, max 150 chars, specific actionable instruction, or null if score is at maximum). Do not return anything outside the JSON object.

Rubric — score must be exactly one of: 0, 5, 10, 15
- 15: Easy to scan, plain language, no unexplained jargon
- 10: Mostly clear with occasional jargon or dense blocks
- 5: Difficult to read due to jargon, long paragraphs, or passive voice
- 0: Consistently confusing or inaccessible`,
  },
  'ux.nav': {
    label: 'Navigation Clarity',
    max: 25,
    allowedScores: [0, 4, 10, 18, 25],
    systemPrompt: `You are evaluating a website's navigation clarity for a website audit. You will receive page content (including nav structure) and business context. Return a JSON object ONLY with keys: "score" (integer from the allowed set), "detail" (string, max 120 chars, what you observed), "fix" (string, max 150 chars, specific actionable instruction, or null if score is at maximum). Do not return anything outside the JSON object.

Rubric — score must be exactly one of: 0, 4, 10, 18, 25
- 25: Navigation immediately identifiable, all links clearly labeled, hierarchy logical
- 18: Clear with minor labeling or hierarchy issues
- 10: Exists but placement or labeling causes confusion
- 4: Difficult to find or inconsistently labeled
- 0: No discernible navigation structure`,
  },
  'ux.hierarchy': {
    label: 'Visual Hierarchy',
    max: 20,
    allowedScores: [0, 7, 14, 20],
    systemPrompt: `You are evaluating a website's visual hierarchy and page structure for a website audit. You will receive page content (including heading structure and layout cues) and business context. Return a JSON object ONLY with keys: "score" (integer from the allowed set), "detail" (string, max 120 chars, what you observed), "fix" (string, max 150 chars, specific actionable instruction, or null if score is at maximum). Do not return anything outside the JSON object.

Rubric — score must be exactly one of: 0, 7, 14, 20
- 20: Clear visual hierarchy with distinct heading levels, well-delineated sections, easy to scan
- 14: Some hierarchy present but inconsistent
- 7: Flat structure, difficult to parse
- 0: No discernible structure`,
  },
  'conv.cta': {
    label: 'CTA Presence and Effectiveness',
    max: 35,
    allowedScores: [0, 5, 15, 25, 35],
    systemPrompt: `You are evaluating a website's calls-to-action for a website audit. You will receive page content and business context including the site's main goal. Return a JSON object ONLY with keys: "score" (integer from the allowed set), "detail" (string, max 120 chars, what you observed), "fix" (string, max 150 chars, specific actionable instruction, or null if score is at maximum). Do not return anything outside the JSON object.

Rubric — score must be exactly one of: 0, 5, 15, 25, 35
- 35: Clear primary CTA above the fold, specific action language, visually distinct
- 25: CTA present above fold with weak language or low visual contrast
- 15: CTA present but below fold or ambiguous
- 5: CTA implied but not explicit
- 0: No CTA present`,
  },
  'conv.trust': {
    label: 'Trust Signals',
    max: 30,
    allowedScores: [0, 5, 12, 20, 30],
    systemPrompt: `You are evaluating a website's trust signals for a website audit. You will receive page content and business context. Return a JSON object ONLY with keys: "score" (integer from the allowed set), "detail" (string, max 120 chars, what you observed), "fix" (string, max 150 chars, specific actionable instruction, or null if score is at maximum). Do not return anything outside the JSON object.

Rubric — score must be exactly one of: 0, 5, 12, 20, 30
- 30: Multiple trust indicators present (testimonials, client logos, case studies, certifications, or reviews)
- 20: Two trust indicators present
- 12: One trust indicator present
- 5: Weak or generic trust language only, no social proof
- 0: No trust signals present`,
  },
};
