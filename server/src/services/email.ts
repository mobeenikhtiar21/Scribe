import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (process.env.SENDGRID_API_KEY) {
      // Production: SendGrid SMTP
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    } else {
      // Development: log emails to console
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions): Promise<void> {
  const transport = getTransporter();
  const fromAddress = from || process.env.EMAIL_FROM || 'noreply@scribe-app.com';

  const result = await transport.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
  });

  // In dev mode (jsonTransport), log the email
  if (!process.env.SENDGRID_API_KEY) {
    console.log('Email (dev mode):', JSON.parse(result.message));
  }
}
