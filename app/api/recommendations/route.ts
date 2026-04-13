// app/api/recommendations/route.ts
// Returns personalised "You Might Also Fear" story picks for the current user.
//
// Scoring (higher = more relevant):
//   +4  story mood matches one of the user's fearMoods (Profile.fearMoods)
//   +3  story mood matches the mood of a story the user has liked
//   +2  story category matches a category the user has liked
//   +1  story is from an author the user follows
//   +0.001 * views  (mild popularity signal)
//   +0.1  * likes   (mild popularity signal)
//
// Stories the user has already read (ReadingHistory) are excluded.
// The current story (passed as ?exclude=id) is always excluded.
//
// Logged-out fallback: returns top stories by views in same mood/category.

import { NextResponse } from 'next/server';
import { cookies }      from 'next/headers';
import { prisma }       from '@/lib/prisma';
import type { Mood }    from '@prisma/client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // The story the user is currently reading — always excluded from results
  const excludeId  = Number(searchParams.get('exclude') ?? 0);
  // Optional hints from the calling page — used for the logged-out fallback
  const hintMood   = searchParams.get('mood')     ?? undefined;
  const hintCatId  = Number(searchParams.get('category') ?? 0) || undefined;
  const take       = Math.min(Number(searchParams.get('take') ?? 4), 10);

  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // ── Shared select shape for result stories ────────────────────────────────
  const storySelect = {
    id: true, title: true, slug: true, coverImage: true, excerpt: true,
    mood: true, categoryId: true, views: true,
    author:   { select: { username: true } },
    category: { select: { name: true } },
    _count:   { select: { likes: true } },
  } as const;

  // ── Logged-out: popular stories in same mood / category ──────────────────
  if (!userId) {
    const fallback = await prisma.story.findMany({
      where: {
        status: 'PUBLISHED',
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          hintMood  ? { mood: hintMood as Mood }       : {},
          hintCatId ? { categoryId: hintCatId }       : {},
        ],
      },
      orderBy: { views: 'desc' },
      take,
      select: storySelect,
    });
    return NextResponse.json(fallback);
  }

  // ── Logged-in: personalised scoring ──────────────────────────────────────

  // 1. User's fear moods (up to 3 comma-separated Mood values)
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { fearMoods: true },
  });
  const fearMoodSet = new Set(
    (profile?.fearMoods ?? '')
      .split(',')
      .map(m => m.trim())
      .filter(Boolean),
  );

  // 2. Stories the user has already read (exclude from candidates)
  const history = await prisma.readingHistory.findMany({
    where: { userId },
    select: { storyId: true },
  });
  const readIds = new Set(history.map(h => h.storyId));
  if (excludeId) readIds.add(excludeId);

  // 3. User's recent likes — extract preferred moods and categories
  const likedStories = await prisma.like.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { story: { select: { mood: true, categoryId: true } } },
  });
  const likedMoodMap = new Map<string, number>();   // mood   → count
  const likedCatMap  = new Map<number, number>();   // catId  → count
  for (const { story } of likedStories) {
    if (story.mood) likedMoodMap.set(story.mood, (likedMoodMap.get(story.mood) ?? 0) + 1);
    if (story.categoryId) likedCatMap.set(story.categoryId, (likedCatMap.get(story.categoryId) ?? 0) + 1);
  }

  // 4. Authors the user follows
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followedAuthorIds = new Set(follows.map(f => f.followingId));

  // 5. Fetch a pool of recent published stories to score
  //    (skip already-read ones in the DB query when practical)
  const poolSize = 80;
  const pool = await prisma.story.findMany({
    where: {
      status: 'PUBLISHED',
      id: readIds.size ? { notIn: [...readIds] } : undefined,
    },
    orderBy: { createdAt: 'desc' },
    take: poolSize,
    select: {
      ...storySelect,
      author: { select: { username: true, id: true } },
    },
  });

  // 6. Score each candidate
  const scored = pool.map(story => {
    let score = 0;

    // Fear profile match
    if (story.mood && fearMoodSet.has(story.mood))         score += 4;

    // Liked-mood match (weighted by how often the user liked that mood)
    if (story.mood) score += (likedMoodMap.get(story.mood) ?? 0) * 0.3;

    // Liked-category match
    if (story.categoryId) score += (likedCatMap.get(story.categoryId) ?? 0) * 0.2;

    // Followed author
    if (followedAuthorIds.has(story.author.id))            score += 1;

    // Popularity signals (small nudge so they don't dominate)
    score += story.views       * 0.001;
    score += story._count.likes * 0.1;

    return { story, score };
  });

  // 7. Sort descending, take top N
  scored.sort((a, b) => b.score - a.score);
  const picks = scored.slice(0, take).map(({ story }) => story);

  return NextResponse.json(picks);
}
