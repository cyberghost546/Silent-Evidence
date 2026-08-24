// PATCH /api/stories/[id] — update a story (owner only)
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { checkAndAwardBadges } from '@/lib/badges';
import { sendMail } from '@/lib/email';
import { updateWritingStreak } from '@/lib/streaks';
import { sanitizeContent } from '@/lib/sanitize';
import { enforceAuthorProFields, AUTHOR_PRO_FIELD_LABELS } from '@/lib/authorPro';
import { z } from 'zod';

const PatchStorySchema = z.object({
  title:            z.string().min(1).max(200).optional(),
  content:          z.string().min(1).max(100_000).optional(),
  excerpt:          z.string().max(500).optional(),
  coverImage:       z.string().optional(),
  videoUrl:         z.string().nullable().optional(),
  audioUrl:         z.string().nullable().optional(),
  isPremiumOnly:    z.boolean().optional(),
  earlyAccessUntil: z.string().nullable().optional(),
  spotifyPlaylistUrl: z.string().nullable().optional(),
  // Price in cents. 0/null = free. Author Pro only — enforced in the handler.
  price:            z.number().int().min(0).max(100_000).nullable().optional(),
  status:           z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED']).optional(),
  categoryId:       z.number().int().positive().optional(),
  scheduledAt:      z.string().nullable().optional(),
  warnings:         z.string().optional(),
});

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

  const rawBody = await req.json();
  const parsed = PatchStorySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }

  const {
    title:            rawTitle,
    content:          rawContent,
    excerpt:          rawExcerpt,
    coverImage:       rawCoverImage,
    videoUrl:         rawVideoUrl,
    audioUrl:         rawAudioUrl,
    isPremiumOnly,
    earlyAccessUntil: earlyAccessUntilRaw,
    status,
    categoryId,
    scheduledAt:      scheduledAtRaw,
    warnings,
    spotifyPlaylistUrl: rawSpotifyUrl,
    price:            rawPrice,
  } = parsed.data;

  // ── Author Pro gate ────────────────────────────────────────────────────────
  // Same rule as story creation. Note this checks `userId`, the person making
  // the edit — a collaborator without Author Pro cannot switch on monetisation
  // for someone else's story, and an author whose plan lapsed cannot turn these
  // features back on. Clearing a gated field is always permitted, so a lapsed
  // author is never stuck unable to remove a price they can no longer charge.
  const { rejected } = await enforceAuthorProFields(userId, {
    price:              rawPrice,
    isPremiumOnly,
    earlyAccessUntil:   earlyAccessUntilRaw,
    audioUrl:           rawAudioUrl,
    videoUrl:           rawVideoUrl,
    spotifyPlaylistUrl: rawSpotifyUrl,
  });
  if (rejected.length > 0) {
    const names = rejected.map((f) => AUTHOR_PRO_FIELD_LABELS[f]).join(', ');
    return NextResponse.json(
      { error: `Author Pro is required for: ${names}. Upgrade at /author-pro.`, upgrade: '/author-pro' },
      { status: 403 },
    );
  }

  const title      = rawTitle      !== undefined ? rawTitle.trim()                           : undefined;
  const content    = rawContent    !== undefined ? sanitizeContent(rawContent.trim())         : undefined;
  const excerpt    = rawExcerpt    !== undefined ? rawExcerpt.trim()                          : undefined;
  const coverImage = rawCoverImage !== undefined ? rawCoverImage.trim()                       : undefined;
  const videoUrl   = rawVideoUrl   !== undefined ? (rawVideoUrl?.trim() ?? null)              : undefined;
  const audioUrl   = rawAudioUrl   !== undefined ? (rawAudioUrl?.trim() ?? null)              : undefined;
  const earlyAccessUntil = earlyAccessUntilRaw !== undefined
    ? (earlyAccessUntilRaw ? new Date(earlyAccessUntilRaw) : null)
    : undefined;
  const spotifyPlaylistUrl = rawSpotifyUrl !== undefined ? (rawSpotifyUrl?.trim() ?? null) : undefined;
  const price = rawPrice !== undefined ? rawPrice : undefined;
  // warnings: JSON-encoded string[] sent from StoryEditForm — already validated as string
  const scheduledAt = scheduledAtRaw !== undefined
    ? (scheduledAtRaw ? new Date(scheduledAtRaw) : null)
    : undefined;

  // SCHEDULED requires a future scheduledAt date
  if (status === 'SCHEDULED' && (!scheduledAt || scheduledAt <= new Date())) {
    return NextResponse.json({ error: 'Scheduled date must be in the future.' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (title        !== undefined) data.title        = title;
  if (content      !== undefined) data.content      = content;
  if (excerpt      !== undefined) data.excerpt      = excerpt || null;
  if (coverImage   !== undefined) data.coverImage   = coverImage || null;
  if (videoUrl          !== undefined) data.videoUrl          = videoUrl || null;
  if (audioUrl          !== undefined) data.audioUrl          = audioUrl || null;
  if (isPremiumOnly     !== undefined) data.isPremiumOnly     = isPremiumOnly;
  if (earlyAccessUntil  !== undefined) data.earlyAccessUntil  = earlyAccessUntil;
  if (spotifyPlaylistUrl !== undefined) data.spotifyPlaylistUrl = spotifyPlaylistUrl || null;
  if (price             !== undefined) data.price             = price || null;
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
