// app/api/stories/route.ts
// GET  — returns paginated published stories, optionally filtered by mood.
// POST — creates a new story for the logged-in user.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { checkAndAwardBadges } from '@/lib/badges';
import { cache, invalidatePattern, TTL } from '@/lib/cache';
import { serverError } from '@/lib/apiError';
import type { Mood } from '@prisma/client';
import { checkStoryToxicity } from '@/lib/toxicityCheck';
import { sanitizeContent } from '@/lib/sanitize';
import { detectMood } from '@/lib/moodDetect';
import { z } from 'zod';

const CreateStorySchema = z.object({
  title:            z.string().min(1, 'Title is required.').max(200, 'Title must be 200 characters or fewer.'),
  content:          z.string().min(1, 'Content is required.').max(100_000, 'Story content is too long.'),
  categoryId:       z.number().int().positive('A valid category is required.'),
  excerpt:          z.string().max(500, 'Excerpt must be 500 characters or fewer.').optional().default(''),
  coverImage:       z.string().optional().default(''),
  status:           z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  language:         z.string().optional(),
  mood:             z.string().nullable().optional(),
  warnings:         z.string().nullable().optional(),
  scheduledAt:      z.string().nullable().optional(),
  locationName:     z.string().nullable().optional(),
  latitude:         z.number().nullable().optional(),
  longitude:        z.number().nullable().optional(),
  videoUrl:         z.string().nullable().optional(),
  audioUrl:         z.string().nullable().optional(),
  isPremiumOnly:    z.boolean().optional().default(false),
  earlyAccessUntil: z.string().nullable().optional(),
});

// GET /api/stories?mood=GORE&take=6
// Returns published stories, optionally filtered by mood, ordered newest first.
// Filters out content the viewer's age group cannot access.
// Results are cached in Redis for 5 minutes to avoid hitting the DB on every page load.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mood = searchParams.get('mood') || undefined;   // undefined = no filter
  const take = Math.min(Number(searchParams.get('take') ?? 6), 30);
  const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);

  // Get the viewer's age group to filter content ratings
  const c        = await cookies();
  const userId   = Number(c.get('userId')?.value ?? 0) || null;
  let ageGroup   = 'ADULT'; // default: show everything for guests
  if (userId) {
    const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { ageGroup: true } });
    ageGroup = viewer?.ageGroup ?? 'ADULT';
  }

  // Determine which content ratings this viewer can see
  const allowedRatings =
    ageGroup === 'UNDER_13' ? ['ALL'] :
    ageGroup === 'TEEN'     ? ['ALL', 'TEEN'] :
    ['ALL', 'TEEN', 'MATURE'];  // ADULT sees everything

  try {
    // Cache key includes ageGroup + skip so different pages get different cached results
    const cacheKey = `stories:list:${mood ?? 'all'}:${take}:${skip}:${ageGroup}`;

    const stories = await cache(cacheKey, TTL.MEDIUM, () =>
      prisma.story.findMany({
        where: {
          status:        'PUBLISHED',
          contentRating: { in: allowedRatings as ('ALL' | 'TEEN' | 'MATURE')[] },
          // Only apply mood filter when a specific mood is requested
          ...(mood ? { mood: mood as Mood } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        // Using include avoids N+1 — Prisma fetches relations in a single extra query,
        // not one query per story. _count uses an aggregate subquery, not separate lookups.
        include: {
          author:   { select: { username: true } },
          category: { select: { name: true, slug: true } },
          _count:   { select: { likes: true, comments: true } },
        },
      })
    );

    return NextResponse.json(stories);
  } catch (err) {
    console.error('[GET /api/stories]', err);
    return serverError();
  }
}

// Converts a title like "The Old House" into a URL slug "the-old-house".
// Appends a short random suffix to keep slugs unique.
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special characters
    .replace(/\s+/g, '-')            // replace spaces with hyphens
    .replace(/-+/g, '-');            // collapse multiple hyphens
  const suffix = Math.random().toString(36).slice(2, 7); // e.g. "k3x9a"
  return `${base}-${suffix}`;
}

export async function POST(req: Request) {
  // Only logged-in users can create stories
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const rawBody = await req.json();
  const parsed = CreateStorySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }

  const {
    title: rawTitle,
    content: rawContent,
    categoryId,
    excerpt:          rawExcerpt,
    coverImage:       rawCoverImage,
    status,
    language,
    mood,
    warnings,
    scheduledAt:      scheduledAtRaw,
    locationName,
    latitude,
    longitude,
    videoUrl:         rawVideoUrl,
    audioUrl:         rawAudioUrl,
    isPremiumOnly,
    earlyAccessUntil: earlyAccessUntilRaw,
  } = parsed.data;

  const title            = rawTitle.trim();
  const content          = sanitizeContent(rawContent.trim());
  const excerpt          = rawExcerpt?.trim() ?? '';
  const coverImage       = rawCoverImage?.trim() ?? '';
  const scheduledAt      = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const earlyAccessUntil = earlyAccessUntilRaw ? new Date(earlyAccessUntilRaw) : null;
  const videoUrl         = rawVideoUrl?.trim() ?? null;
  const audioUrl         = rawAudioUrl?.trim() ?? null;

  // Run AI toxicity check on the title and excerpt before publishing
  // Only check published stories — drafts can be edited before they go live
  if (status === 'PUBLISHED') {
    const toxicity = await checkStoryToxicity(title, excerpt || content.slice(0, 1000));
    if (toxicity.flagged) {
      return NextResponse.json(
        { error: `Content flagged by moderation: ${toxicity.reason ?? 'Policy violation'}. Please revise and try again.` },
        { status: 422 }
      );
    }
  }

  // Auto-detect mood via Ollama when publishing without one set
  let resolvedMood = mood || null;
  if (!resolvedMood && status === 'PUBLISHED') {
    resolvedMood = await detectMood(title, excerpt || content.slice(0, 500)) ?? null;
  }

  // Generate a unique URL slug from the title
  const slug = slugify(title);

  const story = await prisma.story.create({
    data: {
      title,
      slug,
      content,
      excerpt:    excerpt    || null,
      coverImage: coverImage || null,
      status:      scheduledAt ? 'DRAFT' : (status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'),
      language:    language || 'en',
      mood:         resolvedMood,
      warnings:     warnings || null,
      scheduledAt:  scheduledAt || null,
      locationName: locationName || null,
      latitude:     latitude ?? null,
      longitude:    longitude ?? null,
      videoUrl:        videoUrl || null,
      audioUrl:        audioUrl || null,
      isPremiumOnly,
      earlyAccessUntil: earlyAccessUntil || null,
      authorId:     userId,
      categoryId:  Number(categoryId),
    },
  });

  // Award badges if this is a published story (FIRST_STORY, TEN_STORIES)
  if (story.status === 'PUBLISHED') {
    checkAndAwardBadges(userId).catch(() => {});
    // Bust the stories listing cache so the new story appears immediately
    invalidatePattern('stories:list:*').catch(() => {});
  }

  // Return slug + id so the client can redirect and autosave subsequent edits
  return NextResponse.json({ slug: story.slug, id: story.id }, { status: 201 });
}
