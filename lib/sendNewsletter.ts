// lib/sendNewsletter.ts
// Compiles and sends the weekly horror digest to all subscribed users.
// Called from the admin API — never runs automatically (no cron in this stack).
//
// Newsletter contents:
//   • Top 5 stories of the past 7 days (ranked by likes × 3 + views ÷ 10)
//   • A "write your story" CTA
//   • One-click unsubscribe link using a base-64-encoded email token

import { prisma } from './prisma';
import { sendMail } from './mailer';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

// Encodes an email address as a URL-safe base64 token for unsubscribe links.
// Not cryptographically secure — just obfuscation. Replace with HMAC if needed.
function emailToToken(email: string): string {
  return Buffer.from(email).toString('base64url');
}

// Builds the full HTML email for one recipient
function buildHtml({
  username,
  stories,
  unsubToken,
}: {
  username: string;
  stories: {
    title: string;
    slug: string;
    excerpt: string | null;
    coverImage: string | null;
    author: { username: string };
    category: { name: string };
    _count: { likes: number; comments: number };
    views: number;
  }[];
  unsubToken: string;
}): string {
  // Render each top story as a bordered card row
  const storyRows = stories
    .map(
      (s, i) => `
    <tr>
      <td style="padding:0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e1e;border:1px solid #2d2d2d;border-radius:10px;overflow:hidden;">
          <tr>
            ${
              s.coverImage
                ? `<td width="80" style="padding:12px 0 12px 12px;vertical-align:top;">
                    <img src="${s.coverImage}" width="80" height="60" style="object-fit:cover;border-radius:6px;display:block;" alt="${s.title}" />
                   </td>`
                : ''
            }
            <td style="padding:12px 14px;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;color:#dc2626;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${s.category.name}</p>
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#fff;">
                <a href="${BASE_URL}/story/${s.slug}" style="color:#fff;text-decoration:none;">#${i + 1} ${s.title}</a>
              </p>
              ${s.excerpt ? `<p style="margin:0 0 6px;font-size:12px;color:#9ca3af;line-height:1.5;">${s.excerpt.slice(0, 100)}${s.excerpt.length > 100 ? '…' : ''}</p>` : ''}
              <p style="margin:0;font-size:11px;color:#6b7280;">
                by ${s.author.username} &nbsp;·&nbsp; ♥ ${s._count.likes} &nbsp;·&nbsp; 👁 ${s.views.toLocaleString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#1a1a1a;border:1px solid #2d2d2d;border-radius:14px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a0a0a 0%,#2d0808 100%);padding:32px 32px 24px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">💀 Silent Evidence</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;letter-spacing:0.05em;text-transform:uppercase;">Weekly Anime Digest</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:28px 32px 16px;color:#d1d5db;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 8px;">Hey <strong style="color:#fff;">${username}</strong>,</p>
            <p style="margin:0;">The shadows have been busy this week. Here are the top horror stories that had readers sleeping with the lights on:</p>
          </td>
        </tr>

        <!-- Story list -->
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${storyRows}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:8px 32px 32px;text-align:center;">
            <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;">Have a story of your own lurking in the dark?</p>
            <a href="${BASE_URL}/write" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">
              ✍️ Share Your Story
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2d2d2d;font-size:11px;color:#4b5563;line-height:1.6;">
            You're receiving this because you subscribed to the Silent Evidence weekly digest.<br>
            <a href="${BASE_URL}/unsubscribe?token=${unsubToken}" style="color:#6b7280;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <a href="${BASE_URL}/settings" style="color:#6b7280;">Manage preferences</a>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export type NewsletterResult = {
  sent: number;       // emails successfully delivered
  skipped: number;    // users without email or already unsubscribed
  failed: number;     // SMTP errors
  topStories: { title: string; slug: string }[];
};

// Fetches top stories and sends the newsletter to all opted-in users.
// Returns a summary of what happened.
export async function sendWeeklyNewsletter(): Promise<NewsletterResult> {
  // Top 5 stories published in the last 7 days, ranked by engagement score
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', createdAt: { gte: since } },
    include: {
      author:   { select: { username: true } },
      category: { select: { name: true } },
      _count:   { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // fetch more, then score-sort in memory
  });

  // Score = likes × 3 + views ÷ 10 + comments × 2
  const scored = stories
    .map(s => ({ ...s, score: s._count.likes * 3 + s.views / 10 + s._count.comments * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // No recent stories — skip send
  if (scored.length === 0) {
    return { sent: 0, skipped: 0, failed: 0, topStories: [] };
  }

  // All users who opted in and have an email address
  const subscribers = await prisma.user.findMany({
    where: { newsletterSubscribed: true, email: { not: '' } },
    select: { username: true, email: true },
  });

  let sent = 0, skipped = 0, failed = 0;

  for (const user of subscribers) {
    if (!user.email) { skipped++; continue; }

    const ok = await sendMail({
      to: user.email,
      subject: `🩸 This week on Silent Evidence — top horror stories`,
      html: buildHtml({
        username: user.username,
        stories: scored,
        unsubToken: emailToToken(user.email),
      }),
    });

    if (ok) sent++; else failed++;
  }

  return {
    sent,
    skipped,
    failed,
    topStories: scored.map(s => ({ title: s.title, slug: s.slug })),
  };
}

// Returns the top 5 stories of the week without sending any emails.
// Used by the admin preview endpoint.
export async function previewNewsletter() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', createdAt: { gte: since } },
    include: {
      author:   { select: { username: true } },
      category: { select: { name: true } },
      _count:   { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const scored = stories
    .map(s => ({ ...s, score: s._count.likes * 3 + s.views / 10 + s._count.comments * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const subscriberCount = await prisma.user.count({
    where: { newsletterSubscribed: true, email: { not: '' } },
  });

  return { stories: scored, subscriberCount };
}
