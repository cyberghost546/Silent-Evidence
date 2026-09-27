// lib/mailer.ts
// Thin wrapper around nodemailer for sending transactional emails.
// Configure SMTP credentials via environment variables:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

import nodemailer from 'nodemailer';

// `||` rather than `??` so an empty value in .env (SMTP_HOST="") counts as unset.
// With `??`, an empty host made nodemailer connect to 127.0.0.1 and fail silently.
// The Gmail default is kept so existing deploys that never set a host keep working.
const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';

// Names of the settings that are missing — empty means email is configured
const missing = [!user && 'SMTP_USER', !pass && 'SMTP_PASS'].filter(Boolean) as string[];

export const mailConfigured = missing.length === 0;

// Create a reusable transporter using SMTP settings from env
const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // implicit TLS on 465; STARTTLS on 587
  auth: { user, pass },
});

type MailOptions = {
  to: string;
  subject: string;
  html: string;
};

let warned = false;

// Send a single email — returns true on success, false on failure
export async function sendMail({ to, subject, html }: MailOptions): Promise<boolean> {
  // Fail loudly (once) instead of attempting a connection that cannot work.
  // Callers treat email as fire-and-forget, so without this a misconfigured
  // server just drops 2FA codes, password resets, etc. with no visible error.
  if (!mailConfigured) {
    if (!warned) {
      console.warn(
        `[mailer] Email is not configured (missing ${missing.join(', ')}). ` +
          `No emails will be sent — set these in .env.`
      );
      warned = true;
    }
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Silent Evidence" <noreply@silentevidence.com>`,
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
