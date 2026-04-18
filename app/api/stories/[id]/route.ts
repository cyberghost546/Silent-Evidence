// PATCH /api/stories/[id] — update a story (owner only)
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { checkAndAwardBadges } from '@/lib/badges';
import { sendMail } from '@/lib/email';
import { updateWritingStreak } from '@/lib/streaks';
import { sanitizeContent } from '@/lib/sanitize';

type Params = { params: Promise<{ id: string }> };

// Sends newsletter emails to all followers of the story's author.
// Runs in the background — does not block the API response.
async function sendNewsletterAsync({
  storyId,
  authorId,
  slug,
  storyTitle,
}: {
  storyId: number;
  authorId: number;
  slug: string;
  storyTitle: string | undefined;
}) {
  // Fetch the author's username and all followers who have an email address
  const [author, follows] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { username: true } }),
    prisma.follow.findMany({
      where: { followingId: authorId },
      include: { follower: { select: { email: true, username: true } } },
    }),
  ]);

  const authorName = author?.username ?? 'Someone';
  // The public URL of the story — uses NEXT_PUBLIC_SITE_URL env var if set
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const storyUrl = `${siteUrl}/story/${slug}`;
  const displayTitle = storyTitle ?? 'a new story';

  // Send one email per follower (only those with a verified email)
  for (const follow of follows) {
    const email = follow.follower.email;
    if (!email) continue; // skip users who registered without an email

    // Simple HTML email — styled minimally to work in all mail clients
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#111;color:#eee;border-radius:12px;overflow:hidden;">
        <div style="background:#22c55e;padding:20px 24px;">
          <h1 style="margin:0;font-size:20px;color:#fff;">Silent Evidence</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;font-size:16px;">
            <strong>${authorName}</strong> just published a new story:
          </p>
          <h2 style="margin:0 0 20px;font-size:22px;color:#f87171;">${displayTitle}</h2>
          <a href="${storyUrl}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Read Now →
          </a>
          <p style="margin-top:24px;font-size:12px;color:#666;">
            You received this because you follow ${authorName} on Silent Evidence.<br/>
            <a href="${siteUrl}/settings" style="color:#888;">Manage notifications</a>
          </p>
        </div>
      </div>
    `;

    await sendMail({
      to: email,
      subject: `${authorName} published: ${displayTitle}`,
      html,
    });
  }
}

// GET /api/stories/[id] — returns basic public story info (used by Continue Reading strip)
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isFinite(storyId) || storyId <= 0) {
    return NextResponse.json({ error: 'Invalid story ID.' }, { status: 400 });
  }
  const story = await prisma.story.findUnique({
    where: { id: storyId, status: 'PUBLISHED' },
    select: { slug: true, title: true, coverImage: true },
  });
  if (!story) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json(story);
}

export async function PATCH(req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const { id } = await params;
  const storyId = Number(id);

  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true } });
  if (!story) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // Allow the original author OR any accepted co-author to PATCH (edit)
  const isAuthor = story.authorId === userId;
  const isCollaborator = !isAuthor && !!(await prisma.storyCollaborator.findUnique({
    where: { storyId_userId: { storyId, userId } },
    select: { accepted: true },
  }).then(r => r?.accepted === true));
  if (!isAuthor && !isCollaborator) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const body = await req.json();
  const title      = typeof body.title      === 'string' ? body.title.trim()      : undefined;
  const content    = typeof body.content    === 'string' ? sanitizeContent(body.content.trim()) : undefined;
  const excerpt    = typeof body.excerpt    === 'string' ? body.excerpt.trim()    : undefined;
  const coverImage = typeof body.coverImage === 'string' ? body.coverImage.trim() : undefined;
  const videoUrl   = typeof body.videoUrl   === 'string' ? body.videoUrl.trim()   : undefined;
  const status     = body.status;
  const categoryId = body.categoryId ? Number(body.categoryId) : undefined;

  if (title !== undefined && (title.length === 0 || title.length > 200)) {
    return NextResponse.json({ error: 'Title must be between 1 and 200 characters.' }, { status: 400 });
  }
  if (content !== undefined && (content.length === 0 || content.length > 100_000)) {
    return NextResponse.json({ error: 'Content is required and must be under 100,000 characters.' }, { status: 400 });
  }
  const scheduledAt = body.scheduledAt !== undefined
    ? (body.scheduledAt ? new Date(body.scheduledAt) : null)
    : undefined;
  // warnings: JSON-encoded string[] sent from StoryEditForm
  const warnings = typeof body.warnings === 'string' ? body.warnings : undefined;

  const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED'];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }
  // SCHEDULED requires a future scheduledAt date
  if (status === 'SCHEDULED' && (!scheduledAt || scheduledAt <= new Date())) {
    return NextResponse.json({ error: 'Scheduled date must be in the future.' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (title        !== undefined) data.title        = title;
  if (content      !== undefined) data.content      = content;
  if (excerpt      !== undefined) data.excerpt      = excerpt || null;
  if (coverImage   !== undefined) data.coverImage   = coverImage || null;
  if (videoUrl     !== undefined) data.videoUrl     = videoUrl || null;
  if (status       !== undefined) data.status       = status;
  if (categoryId   !== undefined) data.categoryId   = categoryId;
  if (scheduledAt  !== undefined) data.scheduledAt  = scheduledAt;
  if (warnings     !== undefined) data.warnings     = warnings;

  const updated = await prisma.story.update({ where: { id: storyId }, data, select: { slug: true } });

  if (status === 'PUBLISHED') {
    // Award story-count badges and update writing streak (fire-and-forget)
    checkAndAwardBadges(userId).catch(() => {});
    updateWritingStreak(userId).catch(() => {});

    // Send newsletter emails to all followers who have an email address.
    // Done asynchronously so it doesn't delay the API response.
    sendNewsletterAsync({ storyId, authorId: userId, slug: updated.slug, storyTitle: title }).catch(() => {});
  }

  return NextResponse.json({ slug: updated.slug });
}

export async function DELETE(_req: Request, { params }: Params) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const { id } = await params;
  const storyId = Number(id);

  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true } });
  if (!story) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (story.authorId !== userId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  await prisma.story.delete({ where: { id: storyId } });
  return NextResponse.json({ ok: true });
}
