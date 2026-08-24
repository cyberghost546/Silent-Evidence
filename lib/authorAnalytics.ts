// lib/authorAnalytics.ts
// Aggregates an author's performance data for the Author Pro analytics page.
//
// Everything here is derived from tables that already exist — Story, Like,
// Comment, ReadingHistory, StoryPurchase, Tip — so no new writes or tracking
// were added. The value of the feature is the aggregation, not new data
// collection.
//
// All figures cover the requesting author's own stories only.

import { prisma } from '@/lib/prisma';

export interface AuthorAnalytics {
  totals: {
    stories: number;
    published: number;
    views: number;
    likes: number;
    comments: number;
    bookmarks: number;
    // Money, in cents
    salesCents: number;
    tipsCents: number;
  };
  // Per-story breakdown, best performing first
  stories: {
    id: number;
    title: string;
    slug: string;
    status: string;
    views: number;
    likes: number;
    comments: number;
    // Reads recorded in ReadingHistory — distinct from raw `views`, which
    // counts page loads including logged-out visitors
    reads: number;
    salesCents: number;
    // views → likes, as a percentage. Null when a story has no views yet,
    // rather than 0, so the UI can show "—" instead of a misleading 0%.
    engagementRate: number | null;
  }[];
  // Reads per day for the last 30 days, oldest first — for the trend chart
  readsByDay: { date: string; reads: number }[];
}

/** Local YYYY-MM-DD key. Used to bucket reads by calendar day. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getAuthorAnalytics(authorId: number): Promise<AuthorAnalytics> {
  // Every story by this author, with the counts Prisma can aggregate for us.
  const stories = await prisma.story.findMany({
    where:   { authorId },
    orderBy: { views: 'desc' },
    select: {
      id: true, title: true, slug: true, status: true, views: true,
      _count: {
        select: {
          likes: true, comments: true, bookmarks: true, readingHistory: true,
        },
      },
    },
  });

  const storyIds = stories.map((s) => s.id);

  // Thirty-day window for the trend chart, aligned to midnight so the first
  // bucket is a whole day rather than a partial one.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 29);

  // Purchases and tips are queried separately: Prisma's _count cannot sum a
  // column, and we need the money totals rather than the row counts.
  const [purchases, tips, recentReads] = await Promise.all([
    storyIds.length
      ? prisma.storyPurchase.findMany({
          where:  { storyId: { in: storyIds } },
          select: { storyId: true, amount: true },
        })
      : Promise.resolve([]),
    prisma.tip.findMany({
      where:  { toUserId: authorId },
      select: { amount: true },
    }),
    storyIds.length
      ? prisma.readingHistory.findMany({
          where:  { storyId: { in: storyIds }, readAt: { gte: since } },
          select: { readAt: true },
        })
      : Promise.resolve([]),
  ]);

  // Sales per story, so the per-story table can show what each one earned
  const salesByStory = new Map<number, number>();
  for (const p of purchases) {
    salesByStory.set(p.storyId, (salesByStory.get(p.storyId) ?? 0) + p.amount);
  }

  // Pre-seed every day in the window at zero. Without this, days with no reads
  // would be missing from the array entirely and the chart would compress the
  // gaps, drawing a flat line where there was actually a quiet week.
  const buckets = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(dayKey(d), 0);
  }
  for (const r of recentReads) {
    const key = dayKey(new Date(r.readAt));
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }

  const perStory = stories.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    status: s.status,
    views: s.views,
    likes: s._count.likes,
    comments: s._count.comments,
    reads: s._count.readingHistory,
    salesCents: salesByStory.get(s.id) ?? 0,
    engagementRate: s.views > 0
      ? Math.round((s._count.likes / s.views) * 1000) / 10
      : null,
  }));

  return {
    totals: {
      stories:   stories.length,
      published: stories.filter((s) => s.status === 'PUBLISHED').length,
      views:     stories.reduce((n, s) => n + s.views, 0),
      likes:     stories.reduce((n, s) => n + s._count.likes, 0),
      comments:  stories.reduce((n, s) => n + s._count.comments, 0),
      bookmarks: stories.reduce((n, s) => n + s._count.bookmarks, 0),
      salesCents: purchases.reduce((n, p) => n + p.amount, 0),
      tipsCents:  tips.reduce((n, t) => n + t.amount, 0),
    },
    stories: perStory,
    readsByDay: [...buckets.entries()].map(([date, reads]) => ({ date, reads })),
  };
}
