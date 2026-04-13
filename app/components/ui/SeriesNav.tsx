/**
 * SeriesNav.tsx
 *
 * WHAT THIS FILE DOES:
 * A server component that renders a "series navigation" block inside a story
 * page. If the story belongs to a multi-part series it shows:
 *   - The series name (links to the series page)
 *   - A progress bar ("Part 2 of 5")
 *   - Previous and Next story links
 *
 * This keeps readers moving through the series instead of having to find the
 * next part manually.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Make sure your content model has a concept of "series" with an ordering field.
 * 2. Pass the current item's ID, the series ID, and the current position number.
 * 3. The component returns null automatically if the series has only one part,
 *    so it's safe to always render it even when the series data isn't certain.
 *
 * Example usage (in a Server Component story page):
 *   {story.seriesId && (
 *     <SeriesNav storyId={story.id} seriesId={story.seriesId} seriesOrder={story.seriesOrder} />
 *   )}
 */

import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Props: the current story's ID, its series, and its position within that series.
type Props = { storyId: number; seriesId: number; seriesOrder: number };

// SeriesNav — async server component.
export default async function SeriesNav({ storyId, seriesId, seriesOrder }: Props) {
  // Load the series and all its published stories, ordered by their position number.
  // `findUnique` fetches exactly one record by its primary key.
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    include: {
      stories: {
        where: { status: 'PUBLISHED' }, // only show published parts
        orderBy: { seriesOrder: 'asc' }, // part 1, part 2, part 3 …
        select: { id: true, title: true, slug: true, seriesOrder: true },
      },
    },
  });

  // If the series doesn't exist, or has only one published part, don't show the nav
  // (a single-item "series" isn't really a series from the reader's perspective).
  if (!series || series.stories.length < 2) return null;

  // Find where in the ordered list the current story sits.
  // findIndex returns -1 if not found; we use that to safely access prev/next.
  const currentIndex = series.stories.findIndex(s => s.id === storyId);

  // Previous story: one step back in the list; null if we're at the start
  const prev = series.stories[currentIndex - 1] ?? null;

  // Next story: one step forward; null if we're at the end
  const next = series.stories[currentIndex + 1] ?? null;

  // Total number of published parts in this series
  const total = series.stories.length;

  return (
    // Dark card sits inside the story page, visually separated from the body text
    <div className="my-8 bg-gray-800 border border-gray-700 rounded-xl p-5">

      {/* ── Series header ── */}
      {/* Shows the "Series" label, the series name (links to series index), and the part count */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-red-400">Series</span>
        <Link href={`/series/${series.slug}`} className="text-sm font-semibold text-white hover:text-red-300 transition">
          {series.name}
        </Link>
        {/* ml-auto pushes this to the right edge of the flex row */}
        <span className="ml-auto text-xs text-gray-500">Part {seriesOrder} of {total}</span>
      </div>

      {/* ── Progress bar ── */}
      {/* Shows how far through the series the reader is.
          Width is calculated as: (position / total) × 100%.
          e.g. Part 2 of 5 → width = 40% */}
      <div className="w-full h-1 bg-gray-700 rounded-full mb-4">
        <div className="h-1 bg-red-600 rounded-full transition-all" style={{ width: `${(currentIndex + 1) / total * 100}%` }} />
      </div>

      {/* ── Previous / Next navigation ── */}
      <div className="flex gap-3">

        {/* Previous story — if there is one; otherwise an empty flex-1 div holds the space
            so the Next button stays on the right side */}
        {prev ? (
          <Link href={`/story/${prev.slug}`}
            className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-purple-600/50 rounded-lg transition group">
            {/* Arrow changes colour on hover via group-hover */}
            <span className="text-gray-500 group-hover:text-purple-400 transition text-lg">←</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Previous</p>
              {/* truncate cuts off long titles with "…" */}
              <p className="text-sm text-white group-hover:text-purple-300 transition truncate">{prev.title}</p>
            </div>
          </Link>
        ) : <div className="flex-1" /> /* empty spacer when there's no previous part */}

        {/* Next story — if there is one; otherwise an "End of series" placeholder */}
        {next ? (
          <Link href={`/story/${next.slug}`}
            className="flex-1 flex items-center justify-end gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-red-600/50 rounded-lg transition group text-right">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Next</p>
              <p className="text-sm text-white group-hover:text-red-300 transition truncate">{next.title}</p>
            </div>
            {/* flex-shrink-0 prevents the arrow from being squashed by a long title */}
            <span className="text-gray-500 group-hover:text-purple-400 transition text-lg flex-shrink-0">→</span>
          </Link>
        ) : (
          // No next part — the reader has finished the series
          <div className="flex-1 flex items-center justify-end px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg">
            <p className="text-xs text-gray-600">End of series</p>
          </div>
        )}
      </div>
    </div>
  );
}
