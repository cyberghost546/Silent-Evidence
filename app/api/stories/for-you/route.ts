// app/api/stories/for-you/route.ts
// Returns a personalised "For You" story feed for the logged-in user.
//
// Algorithm:
//   1. Collect IDs of authors the user follows.
//   2. Parse the user's fearMoods from their Profile (comma-separated Mood values).
//   3. Get the last 20 story IDs from ReadingHistory so we can exclude them.
//   4. Query stories where author is followed OR mood matches a fear mood.
//   5. Exclude already-read stories.
//   6. Filter by the user's age group / content rating access.
//   7. Limit to 20, newest first.
//   8. If fewer than 10 personalised results, pad with latest published stories.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { unauthorized, serverError } from '@/lib/apiError';
import type { ContentRating, AgeGroup, Mood } from '@prisma/client';

// Maps each AgeGroup to the content ratings that group is allowed to see.
// UNDER_13 → ALL only | TEEN → ALL + TEEN | ADULT → everything
const ALLOWED_RATINGS: Record<AgeGroup, ContentRating[]> = {
  UNDER_13: ['ALL'],
  TEEN: ['ALL', 'TEEN'],
  ADULT: ['ALL', 'TEEN', 'MATURE'],
};

export async function GET() {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    // ── Load user profile data needed for personalisation ────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ageGroup: true, // used to filter content rating
        profile: {
          select: { fearMoods: true }, // comma-separated Mood enum values
        },
        // Followed authors — we want their IDs for the query
        following: {
          select: { followingId: true },
          take: 200, // cap to avoid huge IN clauses
        },
        // Last 20 stories the user has read — excluded from results
        readingHistory: {
          select: { storyId: true },
          orderBy: { readAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) return unauthorized();

    // ── Step 1: followed author IDs ───────────────────────────────────────────
    const followedAuthorIds = user.following.map(f => f.followingId);

    // ── Step 2: parse fear moods from the profile ─────────────────────────────
    // fearMoods is stored as "CREEPY,SUPERNATURAL,GORE" — split and cast to Mood[]
    const rawMoods = user.profile?.fearMoods ?? '';
    const fearMoods: Mood[] = rawMoods
      .split(',')
      .map(s => s.trim())
      .filter(Boolean) as Mood[];

    // ── Step 3: already-read story IDs to exclude ─────────────────────────────
    const readStoryIds = user.readingHistory.map(h => h.storyId);

    // ── Step 4 & 5: build the personalised WHERE clause ───────────────────────
    // Stories must be published, not already read, and match at least one signal
    const allowedRatings = ALLOWED_RATINGS[user.ageGroup] ?? ['ALL'];

    // Compose the OR conditions — we need at least one signal to include a story
    const orConditions: object[] = [];

    if (followedAuthorIds.length > 0) {
      // Include stories by authors the user follows
      orConditions.push({ authorId: { in: followedAuthorIds } });
    }

    if (fearMoods.length > 0) {
      // Include stories whose mood matches one of the user's fear moods
      orConditions.push({ mood: { in: fearMoods } });
    }

    // If the user follows nobody and has no fear moods, fall back to latest stories only
    const personalised = orConditions.length > 0
      ? await prisma.story.findMany({
          where: {
            status: 'PUBLISHED',
            contentRating: { in: allowedRatings },            // age-appropriate content only
            id: readStoryIds.length > 0
              ? { notIn: readStoryIds }                       // exclude already-read
              : undefined,
            OR: orConditions,                                  // author OR mood match
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            author: {
              select: {
                username: true,
                isVerified: true,
                profile: { select: { avatar: true } },
              },
            },
            category: { select: { name: true, slug: true } },
            _count: { select: { likes: true, comments: true } },
          },
        })
      : [];

    // ── Step 8: pad with latest stories if personalised feed is thin ─────────
    // Fewer than 10 results? Top up with the most recent published stories.
    let results = personalised;

    if (personalised.length < 10) {
      // IDs we already have — so we don't show duplicates in the padding
      const existingIds = new Set(personalised.map(s => s.id));
      // Also exclude stories already read, and stories authored by the user themselves
      const excludeIds = [
        ...readStoryIds,
        ...existingIds,
      ];

      const padding = await prisma.story.findMany({
        where: {
          status: 'PUBLISHED',
          contentRating: { in: allowedRatings },
          id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
        },
        orderBy: { createdAt: 'desc' },
        take: 20 - personalised.length, // only as many as we need to reach 20
        include: {
          author: {
            select: {
              username: true,
              isVerified: true,
              profile: { select: { avatar: true } },
            },
          },
          category: { select: { name: true, slug: true } },
          _count: { select: { likes: true, comments: true } },
        },
      });

      // Merge personalised stories first, then padding
      results = [...personalised, ...padding];
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('[GET /api/stories/for-you]', err);
    return serverError();
  }
}
