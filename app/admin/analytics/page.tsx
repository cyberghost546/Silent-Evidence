// app/admin/analytics/page.tsx
//
// Server-rendered admin analytics dashboard.
// Because this is a Server Component it runs entirely on the server — no JS is
// sent to the browser for this page, and it can query the database directly.
//
// ── Access control ──────────────────────────────────────────────────────────
// Requires the signed-in user to have role === 'ADMIN'.
// Anyone else (not logged in, or logged in but not an admin) is redirected
// away before any data is fetched.
//
// ── What it shows ───────────────────────────────────────────────────────────
//   • Four summary stat cards  — total users, published stories, comments, views
//   • Two line charts (last 14 days) — new signups per day, new stories per day
//   • One bar chart (all time)  — story count broken down by category
//
// All queries run at request time with no caching, so the numbers are always
// live when the admin reloads the page.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SignupsChart, StoriesChart, CategoryChart } from '@/app/components/ui/AnalyticsCharts';

export default async function AnalyticsPage() {

  // ── Auth check ─────────────────────────────────────────────────────────────
  // `cookies()` reads the HTTP request cookies on the server.
  // The app stores the logged-in user's database ID in a cookie called "userId".
  // If that cookie is missing (value is undefined) we default to 0, which will
  // never match a real user — so the `!userId` guard below redirects to /login.
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  // Fetch only the `role` field — we don't need the full user record here.
  // `findUnique` returns null if no user with that id exists (e.g. stale cookie).
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // If the user isn't ADMIN, kick them to the home page.
  // The optional-chaining `me?.role` handles the null case gracefully.
  if (me?.role !== 'ADMIN') redirect('/');

  // ── Last-14-days time-series data ──────────────────────────────────────────
  // We build one data point per calendar day, counting how many stories, users,
  // and comments were created on that day.
  //
  // How the loop works:
  //   i = 13 → 13 days ago (oldest)  …  i = 0 → today (newest)
  // This fills `days` in chronological order so the charts read left-to-right.
  const days: { date: string; stories: number; users: number; comments: number }[] = [];

  for (let i = 13; i >= 0; i--) {
    // Build the start of the day (midnight) for `i` days ago
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0); // 00:00:00.000

    // Build the end of the same day (one millisecond before midnight)
    const end = new Date(start);
    end.setHours(23, 59, 59, 999); // 23:59:59.999

    // Short display label for the chart x-axis, e.g. "Apr 17"
    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Count all three record types created within this exact calendar day.
    // Promise.all runs the three queries in parallel — faster than sequential awaits.
    const [stories, users, comments] = await Promise.all([
      prisma.story.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.comment.count({ where: { createdAt: { gte: start, lte: end } } }),
    ]);

    days.push({ date: label, stories, users, comments });
  }

  // ── Category breakdown ─────────────────────────────────────────────────────
  // Fetch every category and include the count of stories linked to it.
  // `_count: { select: { stories: true } }` tells Prisma to add a virtual
  // `_count.stories` field — no raw SQL needed.
  // `orderBy: { stories: { _count: 'desc' } }` puts the most-used category first.
  const categories = await prisma.category.findMany({
    include: { _count: { select: { stories: true } } },
    orderBy: { stories: { _count: 'desc' } },
  });

  // Reshape into a simple { name, count } array that the chart component expects
  const categoryData = categories.map(c => ({ name: c.name, count: c._count.stories }));

  // ── All-time totals ────────────────────────────────────────────────────────
  // Four queries run in parallel via Promise.all.
  // `prisma.story.aggregate` with `_sum` sums the `views` column across all rows.
  // If no stories exist yet, `_sum.views` is null — the `?? 0` handles that.
  const [totalUsers, totalStories, totalComments, totalViews] = await Promise.all([
    prisma.user.count(),
    prisma.story.count({ where: { status: 'PUBLISHED' } }),
    prisma.comment.count(),
    prisma.story.aggregate({ _sum: { views: true } }),
  ]);

  // Build the stats array used by the four summary cards.
  // Each entry has a display label, a pre-formatted value string, and a Tailwind
  // color class so each card has a distinct accent colour.
  const stats = [
    { label: 'Total Users',       value: totalUsers.toLocaleString(),                   color: 'text-blue-400'   },
    { label: 'Published Stories', value: totalStories.toLocaleString(),                 color: 'text-red-400'    },
    { label: 'Total Comments',    value: totalComments.toLocaleString(),                 color: 'text-red-400'    },
    { label: 'Total Views',       value: (totalViews._sum.views ?? 0).toLocaleString(), color: 'text-orange-400' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  // The charts (SignupsChart, StoriesChart, CategoryChart) are Client Components
  // imported from AnalyticsCharts — they use a charting library (Recharts) that
  // needs the browser to draw SVG. Passing plain JSON arrays as props is the
  // standard Server → Client data hand-off pattern in Next.js App Router.
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Site Analytics</h1>

      {/* ── Summary stat cards ──────────────────────────────────────────────
          2 columns on small screens, 4 columns on large screens (lg:grid-cols-4).
          Rendered from the `stats` array so adding a new card only requires
          pushing one more object into the array above. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center">
            {/* Large bold number with the per-stat accent colour */}
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Line charts (14-day trends) ──────────────────────────────────────
          Side-by-side on large screens, stacked on small screens.
          Both receive the same `days` array — each chart just reads a
          different field (users vs stories) from each data point. */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">New Users — Last 14 Days</h2>
          {/* SignupsChart reads `days[n].users` to draw the signups line */}
          <SignupsChart data={days} />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">New Stories — Last 14 Days</h2>
          {/* StoriesChart reads `days[n].stories` to draw the stories line */}
          <StoriesChart data={days} />
        </div>
      </div>

      {/* ── Category bar chart (all-time) ───────────────────────────────────
          Full-width panel. CategoryChart receives the pre-sorted categoryData
          array (most popular category first) and renders a bar for each. */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Stories by Category</h2>
        <CategoryChart data={categoryData} />
      </div>
    </div>
  );
}
