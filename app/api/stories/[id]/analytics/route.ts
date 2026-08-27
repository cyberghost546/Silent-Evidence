// app/api/stories/[id]/analytics/route.ts
// GET — returns analytics for a single story.
// Only the story's author can access this endpoint.
// Returns total views, likes, comments, bookmarks, and a 7-day reads chart.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const c = await cookies();
    const userId = Number(c.get('userId')?.value ?? 0);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const storyId = Number(id);
    if (!storyId) return NextResponse.json({ error: 'Invalid story id' }, { status: 400 });

    // Verify the requesting user is the story author
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        authorId: true,
        views: true,
        _count: { select: { likes: true, comments: true, bookmarks: true } },
      },
    });
    if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (story.authorId !== userId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Build the 7-day reads chart from ReadingHistory records and compute avg completion
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentReads, allProgress] = await Promise.all([
      prisma.readingHistory.findMany({
        where: { storyId, readAt: { gte: sevenDaysAgo } },
        select: { readAt: true },
      }),
      prisma.readingHistory.findMany({
        where: { storyId, progress: { gt: 0 } },
        select: { progress: true },
      }),
    ]);

    // Initialise all 7 days with 0
    const dayCounts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayCounts[d.toISOString().slice(0, 10)] = 0;
    }
    for (const r of recentReads) {
      const day = r.readAt.toISOString().slice(0, 10);
      if (day in dayCounts) dayCounts[day]++;
    }

    const weeklyChart = Object.entries(dayCounts).map(([date, reads]) => ({ date, reads }));

    // Average completion rate across all readers who scrolled past 0%
    const avgCompletion =
      allProgress.length > 0
        ? Math.round(allProgress.reduce((sum, r) => sum + r.progress, 0) / allProgress.length)
        : null;

    return NextResponse.json({
      views: story.views,
      likes: story._count.likes,
      comments: story._count.comments,
      bookmarks: story._count.bookmarks,
      weeklyChart,
      avgCompletion,
    });
  } catch (err) {
    console.error('[GET /api/stories/[id]/analytics]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
