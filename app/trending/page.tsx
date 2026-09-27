// =============================================================================
// app/trending/page.tsx  —  SERVER COMPONENT
// =============================================================================
// Displays horror stories ranked by "velocity" — a score computed from recent
// likes and total view count.  The time window (24h / 7d / 30d) is driven by
// the ?window= query-string parameter so each tab produces a shareable URL.
//
// Key concepts used here:
//  • Server Component  — all DB queries run on the server; nothing is exposed
//    to client-side JavaScript.
//  • searchParams prop — Next.js 14 App Router passes URL query parameters as
//    a Promise<Record<string,string>>.  We await it at the top of the function.
//  • Prisma groupBy    — used to aggregate recent likes into a per-story count
//    without fetching every Like row individually.
//  • Velocity scoring  — a simple formula (recent_likes × 3 + views / 100)
//    weights freshness more heavily than raw popularity.
//  • JSON.parse/stringify round-trip — required when passing Prisma results to
//    a Client Component because Prisma includes non-serialisable types (Date,
//    BigInt).  The round-trip converts them to plain JS values.
// =============================================================================

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { readingTime } from '@/lib/readingTime';
import TrendingStories from './TrendingStories';

// -----------------------------------------------------------------------------
// TypeScript: searchParams is typed as Promise<…> because Next.js 14 resolves
// query parameters asynchronously in Server Components.
// -----------------------------------------------------------------------------
type Props = { searchParams: Promise<{ window?: string }> };

// Static metadata — this page doesn't need per-request metadata so a simple
// object export is sufficient (no generateMetadata function needed).
export const metadata = { title: 'Trending — Silent Evidence' };

export default async function TrendingPage({ searchParams }: Props) {
  // Await the searchParams promise to get the resolved query-string values.
  // Destructure `window` (renamed to `win` to avoid shadowing the browser
  // global `window`) and default it to '24h' if absent.
  const { window: win = '24h' } = await searchParams;

  // Map the URL ?window= value to a number of days so we can build a cutoff
  // Date.  Unknown values fall back to 1 day via the ?? operator.
  const cutoffMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30 };
  const days = cutoffMap[win] ?? 1;

  // Compute the cutoff timestamp: subtract `days` days from right now.
  // We'll use this to filter Likes created after this point in time.
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // ---------------------------------------------------------------------------
  // Prisma query 1 — fetch up to 100 published stories with their author,
  // category, and aggregate counts.  We fetch more than we need (100) so the
  // subsequent velocity sort has enough data to produce a good top-30.
  //
  // include vs select: `include` is used here because we want the full author
  // and category relations plus computed _count aggregates in one query.
  // ---------------------------------------------------------------------------
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 100, // fetch enough to sort by velocity
    include: {
      author: {
        select: { username: true, isVerified: true, profile: { select: { avatar: true } } },
      },
      category: { select: { name: true, slug: true } },
      // _count asks Prisma to return the total row count for each relation
      _count: { select: { likes: true, comments: true } },
    },
  });

  // ---------------------------------------------------------------------------
  // Prisma query 2 — count Likes per story within the chosen time window.
  //
  // groupBy lets us aggregate at the database level rather than fetching every
  // like and counting in JS.  This is much faster for stories with many likes.
  //
  // Result shape: [{ storyId: 42, _count: { storyId: 7 } }, …]
  // ---------------------------------------------------------------------------
  const storyIds = stories.map((s) => s.id);
  const recentLikes = await prisma.like.groupBy({
    by: ['storyId'], // group one row per story
    where: { storyId: { in: storyIds }, createdAt: { gte: cutoff } },
    _count: { storyId: true }, // count matching likes
  });

  // Convert the groupBy array to a plain lookup object { storyId → likeCount }
  // so we can access each story's recent likes in O(1) during the sort below.
  const likesMap = Object.fromEntries(recentLikes.map((r) => [r.storyId, r._count.storyId]));

  // ---------------------------------------------------------------------------
  // Velocity scoring formula:
  //   score = recentLikes × 3  +  Math.floor(totalViews / 100)
  //
  // Multiplying recent likes by 3 prioritises content with current engagement
  // over old stories that simply have high all-time view counts.
  // Dividing views by 100 keeps the units roughly comparable.
  // ---------------------------------------------------------------------------
  const scored = stories
    .map((s) => ({
      ...s,
      score: (likesMap[s.id] ?? 0) * 3 + Math.floor(s.views / 100),
    }))
    .sort((a, b) => b.score - a.score) // descending — highest score first
    .slice(0, 30); // keep only the top 30

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* ── Hero section ─────────────────────────────────────────────────────
          bg-gray-950 is darker than the page bg-gray-900 so the hero visually
          separates itself from the card list below.
          The radial-gradient pseudo-background creates a subtle red glow at
          the top of the section, added via Tailwind's arbitrary value syntax.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-12">
        {/* Decorative radial glow — positioned outside the visible area (-10%)
            so only the bottom of the gradient is visible as a top-glow effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.15)_0%,transparent_70%)]" />

        {/* max-w-5xl centres the content and caps its width on large screens */}
        <div className="max-w-5xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-extrabold text-white">Trending</h1>
          </div>
          <p className="text-gray-400 text-sm">Stories making waves right now</p>

          {/* ── Time window tabs ───────────────────────────────────────────
              Each tab is a Next.js <Link> so navigation is a client-side
              transition (no full page reload).  The active tab is highlighted
              with bg-red-600 while inactive tabs use a border-only style.

              Conditional className: the ternary checks `win === val` to apply
              the active vs inactive Tailwind class set.
          ─────────────────────────────────────────────────────────────────── */}
          <div className="flex gap-2 mt-6">
            {[
              ['24h', 'Today'],
              ['7d', 'This Week'],
              ['30d', 'This Month'],
            ].map(([val, label]) => (
              <Link
                key={val}
                href={`/trending?window=${val}`}
                className={`px-4 py-1.5 text-sm rounded-full font-medium transition border ${
                  win === val
                    ? 'bg-red-600 border-red-600 text-white' // active tab
                    : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500' // inactive tab
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Story list ───────────────────────────────────────────────────────
          py-10 gives vertical breathing room between the hero and the footer.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Conditional rendering — show a ghost emoji empty state when there
            are no trending stories for the selected window, otherwise render
            the TrendingStories client component with the scored list. */}
        {scored.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <p>No trending stories yet for this period.</p>
          </div>
        ) : (
          // JSON.parse(JSON.stringify(...)) serialises the Prisma result to a
          // plain object.  This is required because Prisma Date objects aren't
          // directly serialisable across the server→client boundary.
          // The client component (TrendingStories) is responsible for rendering
          // the interactive card list (hover states, etc.).
          <TrendingStories stories={JSON.parse(JSON.stringify(scored))} />
        )}
      </div>

      <Footer />
    </main>
  );
}
