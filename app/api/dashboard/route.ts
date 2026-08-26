// app/api/dashboard/route.ts — GET /api/dashboard
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // All published stories (sorted by views for top-stories)
  const stories = await prisma.story.findMany({
    where: { authorId: userId, status: 'PUBLISHED' },
    orderBy: { views: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      views: true,
      createdAt: true,
      content: true,
      _count: { select: { likes: true, comments: true } },
    },
  });
  const storyIds = stories.map((s) => s.id);

  const [
    followerCount,
    draftCount,
    scheduledCount,
    recentReads7,
    recentReads30,
    prevReads30, // 60–30 days ago for % change
    recentFollows30,
    prevFollows30,
    tips,
    recentTips,
    recentComments,
    thisMonthPublished,
    thisMonthFollowers,
  ] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.story.count({ where: { authorId: userId, status: 'DRAFT' } }),
    prisma.story.count({ where: { authorId: userId, status: 'SCHEDULED' } }),

    storyIds.length
      ? prisma.readingHistory.findMany({
          where: { storyId: { in: storyIds }, readAt: { gte: sevenDaysAgo } },
          select: { readAt: true },
        })
      : Promise.resolve([]),

    storyIds.length
      ? prisma.readingHistory.findMany({
          where: { storyId: { in: storyIds }, readAt: { gte: thirtyDaysAgo } },
          select: { readAt: true },
        })
      : Promise.resolve([]),

    // Previous 30-day window for % change comparison
    storyIds.length
      ? prisma.readingHistory.count({
          where: { storyId: { in: storyIds }, readAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        })
      : Promise.resolve(0),

    prisma.follow.findMany({
      where: { followingId: userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.follow.count({
      where: { followingId: userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),

    prisma.tip.aggregate({ where: { toUserId: userId }, _sum: { amount: true } }),
    prisma.tip.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        message: true,
        createdAt: true,
        from: { select: { username: true } },
      },
    }),

    // Last 6 comments on this author's stories
    storyIds.length
      ? prisma.comment.findMany({
          where: { storyId: { in: storyIds } },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            id: true,
            content: true,
            createdAt: true,
            story: { select: { title: true, slug: true } },
            user: { select: { username: true, profile: { select: { avatar: true } } } },
          },
        })
      : Promise.resolve([]),

    // Stories published this calendar month
    prisma.story.count({
      where: { authorId: userId, status: 'PUBLISHED', createdAt: { gte: startOfMonth } },
    }),

    // New followers this month
    prisma.follow.count({ where: { followingId: userId, createdAt: { gte: startOfMonth } } }),
  ]);

  // ── 7-day chart ──────────────────────────────────────────────────────────────
  const day7Counts: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    day7Counts[new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)] = 0;
  }
  for (const r of recentReads7) {
    const k = r.readAt.toISOString().slice(0, 10);
    if (k in day7Counts) day7Counts[k]++;
  }
  const viewsChart = Object.entries(day7Counts).map(([date, reads]) => ({ date, reads }));

  // ── 30-day reads chart ───────────────────────────────────────────────────────
  const reads30Map: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    reads30Map[new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)] = 0;
  }
  for (const r of recentReads30) {
    const k = r.readAt.toISOString().slice(0, 10);
    if (k in reads30Map) reads30Map[k]++;
  }
  const readsPerDay = Object.entries(reads30Map).map(([date, reads]) => ({
    date: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    value: reads,
  }));

  // ── 30-day followers chart ───────────────────────────────────────────────────
  const follows30Map: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    follows30Map[new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)] = 0;
  }
  for (const f of recentFollows30) {
    const k = f.createdAt.toISOString().slice(0, 10);
    if (k in follows30Map) follows30Map[k]++;
  }
  const followersPerDay = Object.entries(follows30Map).map(([date, count]) => ({
    date: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    value: count,
  }));

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totalViews = stories.reduce((s, st) => s + st.views, 0);
  const totalLikes = stories.reduce((s, st) => s + st._count.likes, 0);
  const totalComments = stories.reduce((s, st) => s + st._count.comments, 0);
  const thisMonthReads = recentReads30.filter((r) => r.readAt >= startOfMonth).length;

  // % change vs previous 30-day window (null = no previous data to compare)
  const readsChange =
    prevReads30 > 0 ? Math.round(((recentReads30.length - prevReads30) / prevReads30) * 100) : null;
  const followersChange =
    prevFollows30 > 0
      ? Math.round(((recentFollows30.length - prevFollows30) / prevFollows30) * 100)
      : null;

  // Best single day (reads) from the 7-day window
  const bestDayReads = Math.max(...Object.values(day7Counts), 0);

  return NextResponse.json({
    totalViews,
    totalLikes,
    totalComments,
    followerCount,
    draftCount,
    scheduledCount,
    publishedCount: stories.length,
    tipEarningsCents: tips._sum.amount ?? 0,
    recentTips: recentTips.map((t) => ({
      id: t.id,
      amount: t.amount,
      message: t.message,
      createdAt: t.createdAt.toISOString(),
      fromUsername: t.from.username,
    })),
    topStories: stories.slice(0, 5),
    viewsChart,
    readsPerDay,
    followersPerDay,
    // New fields
    readsChange,
    followersChange,
    thisMonthPublished,
    thisMonthFollowers,
    thisMonthReads,
    bestDayReads,
    recentComments: recentComments.map((c: any) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      storyTitle: c.story.title,
      storySlug: c.story.slug,
      username: c.user.username,
      avatar: c.user.profile?.avatar ?? null,
    })),
  });
}
