// ============================================================
//  app/api/dashboard/route.ts
//
//  GET /api/dashboard
//
//  Returns a comprehensive set of statistics for the currently
//  logged-in author's dashboard page.  Everything the dashboard
//  charts and summary cards need is returned in one response so
//  the page only needs a single API call.
//
//  Data returned:
//    - Total views, likes, comments across all published stories
//    - Follower count, draft count, scheduled count
//    - Tip earnings (total in cents) and 5 most recent tips
//    - Top 5 stories ranked by views
//    - 7-day bar chart data (reads per day)
//    - 30-day reads line chart data
//    - 30-day follower growth line chart data
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper so we can read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB queries
import { prisma } from '@/lib/prisma';

// ── GET handler ───────────────────────────────────────────────────────────────
// This function runs when a GET request is made to /api/dashboard.
// No parameters are needed because all we need is the userId from the cookie.
export async function GET() {

  // Read all cookies from the incoming request
  const c = await cookies();

  // Extract the userId value from the 'userId' cookie.
  // .get('userId') returns the cookie object (or undefined if missing).
  // ?.value reads the string value (e.g. "42").
  // ?? 0 falls back to "0" if the cookie is missing.
  // Number() converts the string to a number.
  const userId = Number(c.get('userId')?.value ?? 0);

  // If userId is 0 or falsy the user is not logged in — reject immediately
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Calculate the date 30 days ago from now (used for chart windows)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Calculate the date 7 days ago from now (used for the shorter bar chart)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // ── Primary query: fetch all the author's published stories ──────────────
  // We need views, like count, and comment count for the summary totals and
  // for the top-stories list.  ORDER BY views DESC puts the most-read story first.
  const stories = await prisma.story.findMany({
    where: {
      // Only this author's stories
      authorId: userId,
      // Only published ones — drafts and scheduled ones are not shown in totals
      status: 'PUBLISHED',
    },
    // Sort by views descending so we can easily take the top 5 later
    orderBy: { views: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      views: true,
      createdAt: true,
      // _count lets Prisma count related rows without fetching them all
      _count: { select: { likes: true, comments: true } },
    },
  });

  // Extract just the story IDs so we can use them in the reading history queries below
  const storyIds = stories.map(s => s.id);

  // ── Run all remaining queries in parallel for speed ────────────────────────
  // Promise.all waits for every promise in the array to resolve before continuing.
  // This is much faster than running these queries one-by-one because the database
  // handles them concurrently.
  const [
    followerCount,   // total number of users following this author
    draftCount,      // number of this author's unpublished drafts
    scheduledCount,  // number of stories queued for future publication
    recentReads7,    // reading events in the last 7 days (for the bar chart)
    recentReads30,   // reading events in the last 30 days (for the line chart)
    recentFollows,   // new follows in the last 30 days (for the follower chart)
    tips,            // aggregate tip earnings total
    recentTips,      // the 5 most recent individual tips
  ] = await Promise.all([

    // Count all users who follow this author
    prisma.follow.count({ where: { followingId: userId } }),

    // Count this author's stories that are still drafts
    prisma.story.count({ where: { authorId: userId, status: 'DRAFT' } }),

    // Count this author's stories that are scheduled but not yet published
    prisma.story.count({ where: { authorId: userId, status: 'SCHEDULED' } }),

    // Get reading history entries for the last 7 days.
    // We only need the readAt timestamp — not the full story or user — to count reads per day.
    // If the author has no stories yet storyIds will be empty; the ternary skips the query
    // and returns an empty array so we don't send a WHERE IN ([]) to the DB.
    storyIds.length
      ? prisma.readingHistory.findMany({
          where: {
            // Only entries for stories this author wrote
            storyId: { in: storyIds },
            // Only entries from the last 7 days
            readAt: { gte: sevenDaysAgo },
          },
          // We only need the timestamp — the date part will be used as a chart key
          select: { readAt: true },
        })
      : Promise.resolve([]),

    // Same as above but over 30 days for the monthly line chart
    storyIds.length
      ? prisma.readingHistory.findMany({
          where: {
            storyId: { in: storyIds },
            readAt: { gte: thirtyDaysAgo },
          },
          select: { readAt: true },
        })
      : Promise.resolve([]),

    // Get all new follows received in the last 30 days.
    // Each row's createdAt is used to bucket follows into days for the chart.
    prisma.follow.findMany({
      where: {
        // People who followed this specific author
        followingId: userId,
        // Only within the last 30 days
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    }),

    // Aggregate the total amount of all tips received by this author.
    // _sum.amount gives us the sum of the `amount` column for matching rows.
    prisma.tip.aggregate({
      where: { toUserId: userId },
      _sum: { amount: true },
    }),

    // Fetch the 5 most recent tips with the sender's username for the "Recent Tips" card
    prisma.tip.findMany({
      where: { toUserId: userId },
      // Most recent tip first
      orderBy: { createdAt: 'desc' },
      // Limit to 5 rows — we only show a short list in the dashboard
      take: 5,
      select: {
        id: true,
        amount: true,
        message: true,
        createdAt: true,
        // Alias: "from" is the user who sent the tip
        from: { select: { username: true } },
      },
    }),
  ]);

  // ── Build the 7-day chart array ───────────────────────────────────────────
  // Pre-seed every day in the last 7 days with a count of 0.
  // This ensures that days with no reads still appear as bars on the chart
  // (instead of gaps in the data).
  const day7Counts: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    // Compute the date i days ago and format it as "YYYY-MM-DD"
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    // .toISOString() gives "2024-03-15T10:30:00.000Z"; .slice(0,10) gives "2024-03-15"
    day7Counts[d.toISOString().slice(0, 10)] = 0;
  }

  // Now increment the counter for each read event that falls in the 7-day window
  for (const r of recentReads7) {
    // Format the read timestamp to "YYYY-MM-DD" so it matches the key we created above
    const day = r.readAt.toISOString().slice(0, 10);
    // Only increment if this day is in our pre-seeded window (guards against edge cases)
    if (day in day7Counts) day7Counts[day]++;
  }

  // Convert the { "2024-03-15": 3, ... } object into an array of { date, reads } objects
  // that charting libraries like Recharts expect
  const viewsChart = Object.entries(day7Counts).map(([date, reads]) => ({ date, reads }));

  // ── Build the 30-day reads chart array ───────────────────────────────────
  // Same pattern as the 7-day chart but over 30 days
  const reads30Map: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    reads30Map[d.toISOString().slice(0, 10)] = 0;
  }

  // Increment the day bucket for each read event in the 30-day window
  for (const r of recentReads30) {
    const day = r.readAt.toISOString().slice(0, 10);
    if (day in reads30Map) reads30Map[day]++;
  }

  // Map to { date: "Mar 28", value: 5 } — human-readable short date label for axis ticks
  const readsPerDay = Object.entries(reads30Map).map(([date, reads]) => ({
    // toLocaleDateString with 'UTC' timezone prevents off-by-one day shifts from timezones.
    // T12:00:00Z pins the moment to noon UTC so it's safely within the intended calendar day.
    date: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    // The chart uses "value" as the Y-axis data key
    value: reads,
  }));

  // ── Build the 30-day follower growth chart array ──────────────────────────
  // Same bucketing approach but for new followers per day
  const follows30Map: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    follows30Map[d.toISOString().slice(0, 10)] = 0;
  }

  // Increment the day bucket for each new follow event
  for (const f of recentFollows) {
    const day = f.createdAt.toISOString().slice(0, 10);
    if (day in follows30Map) follows30Map[day]++;
  }

  // Convert to the same { date, value } shape as readsPerDay
  const followersPerDay = Object.entries(follows30Map).map(([date, count]) => ({
    date: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    value: count,
  }));

  // ── Assemble and return the final response ────────────────────────────────
  return NextResponse.json({

    // ── Summary totals ───────────────────────────────────────────────────────
    // Sum the views field across all published stories
    totalViews: stories.reduce((s, st) => s + st.views, 0),
    // Sum the like counts using the _count.likes Prisma computed field
    totalLikes: stories.reduce((s, st) => s + st._count.likes, 0),
    // Sum the comment counts
    totalComments: stories.reduce((s, st) => s + st._count.comments, 0),
    // From the parallel query above
    followerCount,
    draftCount,
    scheduledCount,
    // stories array length equals the published count
    publishedCount: stories.length,

    // ── Tip earnings ─────────────────────────────────────────────────────────
    // Tips are stored in cents; ?? 0 handles the case where no tips have been received yet
    tipEarningsCents: tips._sum.amount ?? 0,

    // Map the recent tips array to a flatter, serialisable shape
    recentTips: recentTips.map(t => ({
      id: t.id,
      amount: t.amount,
      message: t.message,
      // Convert the Date object to an ISO string so JSON serialisation works correctly
      createdAt: t.createdAt.toISOString(),
      // Pull up the sender username from the nested `from` relation
      fromUsername: t.from.username,
    })),

    // ── Top 5 stories by view count ──────────────────────────────────────────
    // Since stories is already sorted by views DESC, we just take the first 5
    topStories: stories.slice(0, 5),

    // ── Chart data ───────────────────────────────────────────────────────────
    // 7-day reads per day (used by the existing bar chart component)
    viewsChart,
    // 30-day reads per day (used by the monthly line chart)
    readsPerDay,
    // 30-day new followers per day (used by the follower growth line chart)
    followersPerDay,
  });
}
