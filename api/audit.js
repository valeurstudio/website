import { Resend } from 'resend';
import { runAudit } from './_engine.js';

const TO_EMAIL = process.env.CONTACT_EMAIL || 'contact.studionorthcreative@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Valeur Studio <onboarding@resend.dev>';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      url, businessName, businessType, whatTheySell, targetCustomer,
      mainGoal, name, email, phone, notes,
    } = req.body;

    if (!url || !businessName || !name || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Website URL, business name, your name, and email are required.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Run the audit engine
    const ctx = { businessName, businessType, whatYouSell: whatTheySell, targetCustomer, websiteGoal: mainGoal };
    const audit = await runAudit(url, ctx);

    // Send lead notification email (awaited so it completes before function exits)
    await sendLeadEmail({ url, businessName, businessType, whatTheySell, targetCustomer, mainGoal, name, email, phone, notes }, audit);

    return res.status(200).json({ success: true, audit });

  } catch (err) {
    console.error('Audit error:', err);
    return res.status(500).json({
      error: 'Audit failed',
      details: 'Something went wrong running the audit. Please try again or email us directly at contact.studionorthcreative@gmail.com',
    });
  }
}

// ─── Lead notification ───────────────────────────────────────────────────────

async function sendLeadEmail(lead, audit) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping lead email');
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const score = audit.overallScore ?? 0;
  const scoreLabel = audit.scoreLabel ?? '—';
  const displayUrl = audit.url.replace(/^https?:\/\//, '');
  const topIssues = audit.topIssues.slice(0, 3).map(i => i.detail ?? i.label);

  const row = (label, value) => `
    <tr style="border-bottom:1px solid #F0EBE3;">
      <td style="padding:12px 0;color:#6B7280;width:160px;vertical-align:top;font-size:14px;">${label}</td>
      <td style="padding:12px 0;font-size:14px;font-weight:500;white-space:pre-wrap;">${escapeHtml(value || 'Not provided')}</td>
    </tr>`;

  const issueRows = topIssues.length
    ? topIssues.map(i => `<li style="font-size:13px;color:#6B7280;margin-bottom:6px;">${escapeHtml(i)}</li>`).join('')
    : '<li style="font-size:13px;color:#9CA3AF;">None identified</li>';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#1B2A4A;">
      <div style="background:#F0EBE3;padding:32px;border-radius:8px;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:600;margin:0 0 6px;">New Audit Lead</h1>
        <p style="font-size:14px;color:#6B7280;margin:0;">Submitted via Valeur Studio Website Audit</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Website', lead.url)}
        ${row('Overall Score', `${score} — ${scoreLabel}`)}
        ${row('Business', lead.businessName)}
        ${row('Business type', lead.businessType)}
        ${row('What they sell', lead.whatTheySell)}
        ${row('Target customer', lead.targetCustomer)}
        ${row('Main goal', lead.mainGoal)}
        ${row('Name', lead.name)}
        ${row('Email', lead.email)}
        ${row('Phone', lead.phone)}
        ${row('Notes', lead.notes)}
      </table>
      <div style="margin-top:24px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;color:#1B2A4A;">Top Issues</p>
        <ul style="margin:0;padding-left:18px;">${issueRows}</ul>
      </div>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #F0EBE3;">
        <p style="font-size:12px;color:#9CA3AF;margin:0;">Priority fixes identified: ${audit.priorityFixes.length}. Reply to this email to respond to ${escapeHtml(lead.name)}.</p>
      </div>
    </div>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [TO_EMAIL],
    replyTo: lead.email,
    subject: `New Audit Lead — ${lead.businessName} (${displayUrl})`,
    html,
  });
  if (error) console.error('Lead email failed:', error);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
