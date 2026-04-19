// app/api/stories/trending/route.ts
// Trending stories ranked by a score combining recent likes, comments, and total views.
//
// Score formula (per story):
//   score = (likes in last 48h × 5) + (comments in last 48h × 8) + (total views × 0.1)
//   + recency bonus: +20 if published < 24h ago, +10 if < 3 days, +5 if < 7 days
//
// Returns top 20 trending published stories.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/apiError';

const WINDOW_HOURS = 48;

export async function GET() {
  try {
    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
    const now = new Date();

    // Fetch recently active stories: either recently published, or with recent likes/comments
    const stories = await prisma.story.findMany({
      where: {
        status: 'PUBLISHED',
        // Only consider stories published within the last 30 days for trending
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        author: {
          select: {
            username: true,
            isVerified: true,
            profile: { select: { avatar: true } },
          },
        },
        category: { select: { name: true, slug: true } },
        tags: { select: { name: true, slug: true } },
        likes: {
          where: { createdAt: { gte: windowStart } },
          select: { id: true },
        },
        comments: {
          where: { createdAt: { gte: windowStart } },
          select: { id: true },
        },
        _count: { select: { likes: true, comments: true } },
      },
      take: 200, // score top 200 candidates then sort in-memory
    });

    // Score each story
    const scored = stories.map(story => {
      const recentLikes = story.likes.length;
      const recentComments = story.comments.length;
      const ageMs = now.getTime() - story.createdAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      // Recency bonus
      let recencyBonus = 0;
      if (ageDays < 1) recencyBonus = 20;
      else if (ageDays < 3) recencyBonus = 10;
      else if (ageDays < 7) recencyBonus = 5;

      const score =
        recentLikes * 5 +
        recentComments * 8 +
        story.views * 0.1 +
        recencyBonus;

      // Strip the raw like/comment arrays from the response
      const { likes, comments, ...rest } = story;
      void likes; void comments;

      return { ...rest, trendingScore: Math.round(score) };
    });

    // Sort by score descending, take top 20
    scored.sort((a, b) => b.trendingScore - a.trendingScore);
    const top20 = scored.slice(0, 20);

    return NextResponse.json(top20);
  } catch (err) {
    console.error('[GET /api/stories/trending]', err);
    return serverError();
  }
}
