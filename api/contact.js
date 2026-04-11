import { Resend } from 'resend';

const TO_EMAIL = process.env.CONTACT_EMAIL || 'contact.studionorthcreative@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'StudioNorth <onboarding@resend.dev>';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({
      error: 'Email service not configured',
      details: 'Please email us directly at contact.studionorthcreative@gmail.com',
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { name, email, business, service, description, budget } = req.body;

    // --- Validate required fields ---
    if (!name || !email || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Name, email, and project description are required.'
      });
    }

    // --- Validate email format ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // --- Build email content ---
    const serviceLabel = {
      'brand-identity': 'Brand Identity',
      'web-design': 'Web Design',
      'product-sourcing': 'Product Sourcing',
      'full-package': 'Full Brand Package',
      'not-sure': 'Not Sure Yet',
    }[service] || service || 'Not specified';

    const budgetLabel = {
      'under-5k': 'Under $5,000',
      '5k-10k': '$5,000 — $10,000',
      '10k-25k': '$10,000 — $25,000',
      '25k-plus': '$25,000+',
      'not-sure': 'Not sure yet',
    }[budget] || budget || 'Not specified';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1B2A4A;">
        <div style="background: #F0EBE3; padding: 32px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px;">New Project Inquiry</h1>
          <p style="font-size: 14px; color: #6B7280; margin: 0;">Submitted via Studio North Contact Form</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr style="border-bottom: 1px solid #F0EBE3;">
            <td style="padding: 14px 0; color: #6B7280; width: 140px; vertical-align: top;">Name</td>
            <td style="padding: 14px 0; font-weight: 500;">${escapeHtml(name)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EBE3;">
            <td style="padding: 14px 0; color: #6B7280; vertical-align: top;">Email</td>
            <td style="padding: 14px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #2E4A7A;">${escapeHtml(email)}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EBE3;">
            <td style="padding: 14px 0; color: #6B7280; vertical-align: top;">Business</td>
            <td style="padding: 14px 0;">${escapeHtml(business || 'Not provided')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EBE3;">
            <td style="padding: 14px 0; color: #6B7280; vertical-align: top;">Service</td>
            <td style="padding: 14px 0;">${escapeHtml(serviceLabel)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EBE3;">
            <td style="padding: 14px 0; color: #6B7280; vertical-align: top;">Budget</td>
            <td style="padding: 14px 0;">${escapeHtml(budgetLabel)}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #6B7280; vertical-align: top;">Project</td>
            <td style="padding: 14px 0; white-space: pre-wrap;">${escapeHtml(description)}</td>
          </tr>
        </table>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #F0EBE3;">
          <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
            Reply directly to this email to respond to ${escapeHtml(name)}.
          </p>
        </div>
      </div>
    `;

    // --- Send via Resend ---
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      replyTo: email,
      subject: `New Project Inquiry — ${name}${business ? ` (${business})` : ''}`,
      html: htmlBody,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({
        error: 'Failed to send message',
        details: 'Please try again or email us directly at contact.studionorthcreative@gmail.com'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent. We\'ll be in touch soon.'
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({
      error: 'Something went wrong',
      details: 'Please try again or email us directly at contact.studionorthcreative@gmail.com'
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
