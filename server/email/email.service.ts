import * as dotenv from 'dotenv';

dotenv.config();

function buildFrom(): string {
  const rawEmail = (process.env.RESEND_FROM_EMAIL ?? '').trim();
  const email = rawEmail.replace(/^<+|>+$/g, '').trim();
  const name = (process.env.RESEND_FROM_NAME ?? '').trim();

  // If the env already contains a full "Name <email>" form, honour it as-is
  if (/^[^<>]+<[^<>]+@[^<>]+>$/.test(email)) return email;

  return name ? `${name} <${email}>` : email;
}

class EmailService {
  async sendEmail(to: string, subject: string, text: string, html?: string, cc?: string | string[]) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      console.warn('⚠️  RESEND_API_KEY or RESEND_FROM_EMAIL not configured. Skipping email send.');
      return null;
    }

    console.log(`📧 Sending email to: ${to}`);
    console.log(`   Subject: ${subject}`);

    const body: Record<string, unknown> = {
      from: buildFrom(),
      to,
      subject,
      html: html || text,
      text,
    };

    if (cc) {
      body.cc = Array.isArray(cc) ? cc : [cc];
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error(`❌ Resend error: ${res.status}`, errText);
        throw new Error(`Resend ${res.status}: ${errText}`);
      }

      const data = await res.json() as { id?: string };
      console.log(`✅ Email sent successfully! ID: ${data?.id}`);
      return data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async testEmailConfig() {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromEmail) {
      console.error('RESEND_API_KEY or RESEND_FROM_EMAIL is not set');
      return false;
    }
    console.log('✅ Resend configuration is set');
    console.log(`   From: ${buildFrom()}`);
    return true;
  }
}

export default new EmailService();