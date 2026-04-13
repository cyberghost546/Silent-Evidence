// lib/email.ts
// Nodemailer-based email utility for Silent Evidence.
// Configure SMTP credentials in your .env file:
//   EMAIL_HOST=smtp.gmail.com
//   EMAIL_PORT=587
//   EMAIL_SECURE=false       (true for port 465)
//   EMAIL_USER=you@gmail.com
//   EMAIL_PASS=your-app-password
//   EMAIL_FROM="Silent Evidence <noreply@silentevidence.com>"
//
// If EMAIL_HOST is not set the mailer is disabled and emails are silently skipped.
// This prevents errors in dev environments where SMTP isn't configured.

import nodemailer from 'nodemailer';

// Build the transporter lazily so it's only created when first needed
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  if (!host) return null; // SMTP not configured — emails disabled

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

// Send a single email. Returns true on success, false on failure or if SMTP not configured.
export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false; // Silently skip when not configured

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM ?? 'Silent Evidence <noreply@silentevidence.com>',
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send to', to, err);
    return false;
  }
}
