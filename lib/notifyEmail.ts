// lib/notifyEmail.ts
// Sends transactional email notifications for key social events.
// All sends are fire-and-forget (errors are logged but not re-thrown).
// Only sends if SMTP_HOST is configured — skips silently in local dev.

import { sendMail } from './mailer';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

// Shared email wrapper — branded HTML template
function template(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; background: #111; color: #e5e7eb; margin: 0; padding: 0; }
  .wrap { max-width: 520px; margin: 40px auto; background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 12px; overflow: hidden; }
  .hero { background: linear-gradient(135deg, #1a0a0a 0%, #2d0808 100%); padding: 32px 32px 24px; }
  .hero h1 { margin: 0; font-size: 22px; color: #fff; }
  .hero p  { margin: 4px 0 0; font-size: 13px; color: #9ca3af; }
  .body { padding: 24px 32px; font-size: 15px; line-height: 1.7; color: #d1d5db; }
  .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #dc2626; color: #fff !important; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; }
  .footer { padding: 16px 32px; font-size: 11px; color: #4b5563; border-top: 1px solid #2d2d2d; }
</style></head>
<body>
<div class="wrap">
  <div class="hero">
    <h1>Silent Evidence</h1>
    <p>horror stories that haunt you.</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    You're receiving this because you have an account on Silent Evidence.<br>
    <a href="${BASE_URL}/settings" style="color:#6b7280">Manage notifications</a>
  </div>
</div>
</body></html>`;
}

// Sent to an author when someone follows them
export async function notifyNewFollower({
  toEmail,
  toUsername,
  followerUsername,
}: {
  toEmail: string;
  toUsername: string;
  followerUsername: string;
}) {
  if (!process.env.SMTP_HOST) return; // Skip if SMTP not configured

  await sendMail({
    to: toEmail,
    subject: `${followerUsername} is now following you on Silent Evidence`,
    html: template(`
      <p>Hey <strong>${toUsername}</strong>,</p>
      <p><strong>${followerUsername}</strong> just started following you. Your horror writing is attracting fans!</p>
      <a class="btn" href="${BASE_URL}/user/${followerUsername}">View their profile</a>
    `),
  });
}

// Sent to a story author when someone comments on their story
export async function notifyNewComment({
  toEmail,
  toUsername,
  commenterUsername,
  storyTitle,
  storySlug,
  commentExcerpt,
}: {
  toEmail: string;
  toUsername: string;
  commenterUsername: string;
  storyTitle: string;
  storySlug: string;
  commentExcerpt: string;
}) {
  if (!process.env.SMTP_HOST) return;

  const excerpt = commentExcerpt.length > 120 ? commentExcerpt.slice(0, 120) + '…' : commentExcerpt;

  await sendMail({
    to: toEmail,
    subject: `New comment on "${storyTitle}"`,
    html: template(`
      <p>Hey <strong>${toUsername}</strong>,</p>
      <p><strong>${commenterUsername}</strong> commented on your story <em>"${storyTitle}"</em>:</p>
      <blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#9ca3af;font-style:italic;margin:16px 0;">
        "${excerpt}"
      </blockquote>
      <a class="btn" href="${BASE_URL}/story/${storySlug}#comments">Read & reply</a>
    `),
  });
}

// Sent to a comment author when someone replies to their comment
export async function notifyCommentReply({
  toEmail,
  toUsername,
  replierUsername,
  storyTitle,
  storySlug,
  replyExcerpt,
}: {
  toEmail: string;
  toUsername: string;
  replierUsername: string;
  storyTitle: string;
  storySlug: string;
  replyExcerpt: string;
}) {
  if (!process.env.SMTP_HOST) return;

  const excerpt = replyExcerpt.length > 120 ? replyExcerpt.slice(0, 120) + '…' : replyExcerpt;

  await sendMail({
    to: toEmail,
    subject: `${replierUsername} replied to your comment`,
    html: template(`
      <p>Hey <strong>${toUsername}</strong>,</p>
      <p><strong>${replierUsername}</strong> replied to your comment on <em>"${storyTitle}"</em>:</p>
      <blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#9ca3af;font-style:italic;margin:16px 0;">
        "${excerpt}"
      </blockquote>
      <a class="btn" href="${BASE_URL}/story/${storySlug}#comments">See the reply</a>
    `),
  });
}
