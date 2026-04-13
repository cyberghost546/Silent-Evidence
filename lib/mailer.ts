// lib/mailer.ts
// Thin wrapper around nodemailer for sending transactional emails.
// Configure SMTP credentials via environment variables:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

import nodemailer from 'nodemailer';

// Create a reusable transporter using SMTP settings from env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false, // true for port 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type MailOptions = {
  to: string;
  subject: string;
  html: string;
};

// Send a single email — returns true on success, false on failure
export async function sendMail({ to, subject, html }: MailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? `"Silent Evidence" <noreply@silentevidence.com>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('[mailer] Failed to send email:', err);
    return false;
  }
}
