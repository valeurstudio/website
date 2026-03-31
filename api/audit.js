import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const TO_EMAIL = process.env.CONTACT_EMAIL || 'contact.studionorthcreative@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'StudioNorth <noreply@studionorth.co>';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      url,
      businessName,
      businessType,
      whatTheySell,
      targetCustomer,
      mainGoal,
      name,
      email,
      phone,
      notes,
    } = req.body;

    // Validate required fields
    if (!url || !businessName || !name || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Website URL, business name, your name, and email are required.',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const row = (label, value) => `
      <tr style="border-bottom: 1px solid #F0EBE3;">
        <td style="padding: 12px 0; color: #6B7280; width: 160px; vertical-align: top; font-size: 14px;">${label}</td>
        <td style="padding: 12px 0; font-size: 14px; font-weight: 500; white-space: pre-wrap;">${escapeHtml(value || 'Not provided')}</td>
      </tr>`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1B2A4A;">
        <div style="background: #F0EBE3; padding: 32px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 6px;">New Audit Submission</h1>
          <p style="font-size: 14px; color: #6B7280; margin: 0;">From studionorth.co/audit</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          ${row('Website', url)}
          ${row('Business', businessName)}
          ${row('Business type', businessType)}
          ${row('What they sell', whatTheySell)}
          ${row('Target customer', targetCustomer)}
          ${row('Main goal', mainGoal)}
          ${row('Name', name)}
          ${row('Email', email)}
          ${row('Phone', phone)}
          ${row('Notes', notes)}
        </table>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #F0EBE3;">
          <p style="font-size: 12px; color: #9CA3AF; margin: 0;">Reply directly to this email to respond to ${escapeHtml(name)}.</p>
        </div>
      </div>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      replyTo: email,
      subject: `New Audit Submission — ${businessName} (${url})`,
      html: htmlBody,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({
        error: 'Failed to send submission',
        details: 'Please try again or email us directly at contact.studionorthcreative@gmail.com',
      });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({
      error: 'Something went wrong',
      details: 'Please try again or email us directly at contact.studionorthcreative@gmail.com',
    });
  }
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
