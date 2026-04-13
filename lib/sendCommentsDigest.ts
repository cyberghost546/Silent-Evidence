// lib/sendCommentsDigest.ts
// Sends each story author a digest of comments they haven't been notified about yet.
// "Since last digest" uses User.lastCommentDigestAt (null = since 7 days ago for first send).
// Called from the admin API — admin triggers it manually (or you can wire a cron later).

import { prisma } from './prisma';
import { sendMail } from './mailer';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

type DigestResult = {
  authorsNotified: number;
  totalComments: number;
  skipped: number; // authors with no new comments
};

export async function sendCommentsDigest(): Promise<DigestResult> {
  // All authors who have published at least one story
  const authors = await prisma.user.findMany({
    where: {
      stories: { some: { status: 'PUBLISHED' } },
      email:   { not: '' },
    },
    select: {
      id: true,
      email: true,
      username: true,
      lastCommentDigestAt: true,
      stories: {
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, slug: true },
      },
    },
  });

  let authorsNotified = 0;
  let totalComments   = 0;
  let skipped         = 0;

  for (const author of authors) {
    // Cutoff: last digest time, or 7 days ago if never sent
    const since = author.lastCommentDigestAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const storyIds = author.stories.map(s => s.id);

    // All comments on this author's stories since the cutoff, excluding self-comments
    const comments = await prisma.comment.findMany({
      where: {
        storyId: { in: storyIds },
        userId:  { not: author.id },       // exclude the author's own comments
        createdAt: { gt: since },
      },
      include: {
        user:  { select: { username: true } },
        story: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (comments.length === 0) { skipped++; continue; }

    // Group comments by story for a cleaner email layout
    const byStory = new Map<string, typeof comments>();
    for (const c of comments) {
      const key = c.story.slug;
      if (!byStory.has(key)) byStory.set(key, []);
      byStory.get(key)!.push(c);
    }

    // Build story sections for the email
    const storySections = [...byStory.entries()]
      .map(([slug, cs]) => {
        const storyTitle = cs[0].story.title;
        const rows = cs
          .slice(0, 5) // cap at 5 comments per story to keep email concise
          .map(c => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #2d2d2d;">
                <p style="margin:0;font-size:13px;color:#fff;font-weight:600;">${c.user.username}</p>
                <p style="margin:2px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
                  "${c.content.slice(0, 120)}${c.content.length > 120 ? '…' : ''}"
                </p>
              </td>
            </tr>`)
          .join('');
        const moreCount = cs.length > 5 ? cs.length - 5 : 0;

        return `
          <div style="margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#22c55e;">
              <a href="${BASE_URL}/story/${slug}#comments" style="color:#22c55e;text-decoration:none;">${storyTitle}</a>
              <span style="color:#6b7280;font-weight:400;"> — ${cs.length} new comment${cs.length !== 1 ? 's' : ''}</span>
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            ${moreCount > 0 ? `<p style="margin:6px 0 0;font-size:11px;color:#6b7280;">+ ${moreCount} more</p>` : ''}
          </div>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#111;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#1a1a1a;border:1px solid #2d2d2d;border-radius:14px;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#1a0a0a 0%,#2d0808 100%);padding:28px 32px 20px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">💬 Comment Digest</p>
        <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Your latest reader reactions on Silent Evidence</p>
      </td></tr>
      <tr><td style="padding:24px 32px;">
        <p style="margin:0 0 20px;font-size:15px;color:#d1d5db;">
          Hey <strong style="color:#fff;">${author.username}</strong>,
          here's what your readers have been saying since your last digest:
        </p>
        ${storySections}
        <a href="${BASE_URL}/dashboard" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#22c55e;color:#fff;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;">
          View All Comments
        </a>
      </td></tr>
      <tr><td style="padding:14px 32px;border-top:1px solid #2d2d2d;font-size:11px;color:#4b5563;">
        You're receiving this because you're an author on Silent Evidence.
        <a href="${BASE_URL}/settings" style="color:#6b7280;">Manage preferences</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    const ok = await sendMail({
      to: author.email,
      subject: `💬 ${comments.length} new comment${comments.length !== 1 ? 's' : ''} on your stories`,
      html,
    });

    if (ok) {
      // Update the cutoff timestamp so we don't re-send the same comments next time
      await prisma.user.update({
        where: { id: author.id },
        data: { lastCommentDigestAt: new Date() },
      });
      authorsNotified++;
      totalComments += comments.length;
    }
  }

  return { authorsNotified, totalComments, skipped };
}

// Preview only — returns data without sending emails
export async function previewCommentsDigest() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const authorCount = await prisma.user.count({
    where: { stories: { some: { status: 'PUBLISHED' } }, email: { not: '' } },
  });

  const newComments = await prisma.comment.count({
    where: {
      createdAt: { gt: since },
      story: { status: 'PUBLISHED' },
    },
  });

  return { authorCount, newComments };
}
