// app/api/users/suggested/route.ts
// Suggests up to 10 authors the logged-in user might want to follow.
//
// Algorithm:
//   1. Look at the user's last 50 read stories → collect their categories and moods.
//   2. Find authors who write in those same categories/moods (published stories only).
//   3. Exclude: the user themselves, authors already followed, and authors with 0 stories.
//   4. Score each candidate author:
//        +2 per published story matching a category the user has read
//        +3 per published story matching a mood the user prefers
//   5. Return top 10 by score, with basic profile info.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { unauthorized, serverError } from '@/lib/apiError';

export async function GET() {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    // ── Step 1: user's reading signals ───────────────────────────────────────
    const history = await prisma.readingHistory.findMany({
      where: { userId },
      orderBy: { readAt: 'desc' },
      take: 50,
      select: {
        story: { select: { categoryId: true, mood: true } },
      },
    });

    // Build frequency maps so we can weight by how often they read each category/mood
    const categoryFreq = new Map<number, number>();
    const moodFreq = new Map<string, number>();

    for (const { story } of history) {
      if (story.categoryId) {
        categoryFreq.set(story.categoryId, (categoryFreq.get(story.categoryId) ?? 0) + 1);
      }
      if (story.mood) {
        moodFreq.set(story.mood, (moodFreq.get(story.mood) ?? 0) + 1);
      }
    }

    const categoryIds = [...categoryFreq.keys()];
    const moods = [...moodFreq.keys()];

    // ── Step 2: who the user already follows ─────────────────────────────────
    const alreadyFollowing = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followedIds = new Set(alreadyFollowing.map((f) => f.followingId));
    followedIds.add(userId); // exclude self

    // ── Step 3: candidate authors writing in those categories/moods ──────────
    if (categoryIds.length === 0 && moods.length === 0) {
      // Cold start: user hasn't read anything yet → return most-followed authors
      const popular = await prisma.user.findMany({
        where: {
          id: { notIn: [...followedIds] },
          stories: { some: { status: 'PUBLISHED' } },
        },
        orderBy: { followers: { _count: 'desc' } },
        take: 10,
        select: {
          id: true,
          username: true,
          isVerified: true,
          profile: { select: { avatar: true, bio: true } },
          _count: { select: { stories: true, followers: true } },
        },
      });
      return NextResponse.json(popular.map((u) => ({ ...u, matchScore: 0 })));
    }

    // Fetch authors with at least one published story in matching categories/moods
    const candidateStories = await prisma.story.findMany({
      where: {
        status: 'PUBLISHED',
        authorId: { notIn: [...followedIds] },
        OR: [
          ...(categoryIds.length > 0 ? [{ categoryId: { in: categoryIds } }] : []),
          ...(moods.length > 0 ? [{ mood: { in: moods as never[] } }] : []),
        ],
      },
      select: {
        authorId: true,
        categoryId: true,
        mood: true,
      },
      take: 1000,
    });

    // ── Step 4: score each candidate author ───────────────────────────────────
    const authorScores = new Map<number, number>();

    for (const story of candidateStories) {
      const prev = authorScores.get(story.authorId) ?? 0;
      let delta = 0;

      if (story.categoryId && categoryFreq.has(story.categoryId)) {
        // Weight by how frequently the user reads that category (capped at 5x)
        delta += 2 * Math.min(categoryFreq.get(story.categoryId)!, 5);
      }
      if (story.mood && moodFreq.has(story.mood)) {
        delta += 3 * Math.min(moodFreq.get(story.mood)!, 5);
      }

      authorScores.set(story.authorId, prev + delta);
    }

    // Sort by score and take top 10
    const topAuthorIds = [...authorScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    if (topAuthorIds.length === 0) {
      return NextResponse.json([]);
    }

    // ── Step 5: fetch full author profiles ───────────────────────────────────
    const authors = await prisma.user.findMany({
      where: { id: { in: topAuthorIds } },
      select: {
        id: true,
        username: true,
        isVerified: true,
        profile: { select: { avatar: true, bio: true } },
        _count: { select: { stories: true, followers: true } },
      },
    });

    // Reattach scores and sort back to score order
    const scoreMap = new Map(authorScores);
    const result = authors
      .map((a) => ({ ...a, matchScore: scoreMap.get(a.id) ?? 0 }))
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/users/suggested]', err);
    return serverError();
  }
}
