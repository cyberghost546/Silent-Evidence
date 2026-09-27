/**
 * Pagination.tsx
 *
 * PURPOSE:
 * A reusable, purely presentational pagination bar. It renders Prev/Next links and
 * a sliding window of up to 5 numbered page buttons centred around the current page,
 * with ellipsis ("…") separators and jump-to-first / jump-to-last links when needed.
 *
 * DESIGN DECISIONS:
 *  - Stateless: the component does not track the current page itself. The parent page
 *    owns that state (usually via a URL search param like `?page=3`).
 *  - `buildHref` callback: instead of accepting a base URL string and building URLs
 *    internally, we ask the parent to supply a function that converts a page number
 *    into a full URL. This keeps Pagination completely decoupled from routing logic —
 *    it works on any page regardless of URL structure.
 *  - Next.js `<Link>`: all clickable items are Next.js Links so navigation is client-
 *    side (no full page reload) and preloading on hover works automatically.
 *  - Disabled states: Prev on page 1 and Next on the last page are rendered as <span>
 *    elements (not links) with cursor-not-allowed so they're visually and semantically
 *    inactive without needing JS event handlers.
 *
 * Usage example:
 *   <Pagination
 *     page={3}
 *     totalPages={10}
 *     buildHref={(p) => `/category/horror?page=${p}`}
 *   />
 */

import Link from 'next/link';

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  /** The page the user is currently viewing. 1-based (page 1 is the first page). */
  page: number;
  /** Total number of pages available in the data set. */
  totalPages: number;
  /**
   * A function provided by the parent that converts a page number into a
   * navigable URL string.
   * Example: (p) => `/stories?page=${p}`
   */
  buildHref: (page: number) => string;
};

export default function Pagination({ page, totalPages, buildHref }: Props) {
  // If there's only one page of results there's nothing to paginate —
  // render nothing rather than a useless bar with a single "1" button.
  if (totalPages <= 1) return null;

  // ── Sliding window of page numbers ────────────────────────────────────────
  // We show at most 5 consecutive page numbers: up to 2 before and 2 after the
  // current page. Math.max/min clamp the window so it never goes below 1 or
  // above totalPages (e.g. page 2 of 100 shows [1, 2, 3, 4] not [-1, 0, 1, 2]).
  const pages: number[] = [];
  const start = Math.max(1, page - 2); // first page number to show
  const end = Math.min(totalPages, page + 2); // last page number to show
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    // Flex row, centred, with small gaps between each element.
    // mt-12 pushes the bar away from the story grid above it.
    <div className="flex items-center justify-center gap-1 mt-12">
      {/* ── Prev button ─────────────────────────────────────────────────────
          When page > 1: a clickable <Link> that navigates to the previous page.
          When on page 1: a non-interactive <span> with dimmed styles and
          cursor-not-allowed to signal that there are no earlier pages. */}
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition"
        >
          ← Prev
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm rounded-lg bg-gray-800/40 border border-gray-700/40 text-gray-600 cursor-not-allowed">
          ← Prev
        </span>
      )}

      {/* ── Leading ellipsis + jump to page 1 ────────────────────────────────
          Only shown when the sliding window doesn't start at page 1.
          A "…" separator is added between "1" and the first visible page when
          they are not adjacent (i.e. start > 2). */}
      {start > 1 && (
        <>
          {/* Jump directly to page 1 */}
          <Link
            href={buildHref(1)}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition"
          >
            1
          </Link>
          {/* Ellipsis gap — only rendered when there is a gap between "1" and the window start */}
          {start > 2 && <span className="px-2 text-gray-600">…</span>}
        </>
      )}

      {/* ── Numbered page buttons ─────────────────────────────────────────────
          The active page gets a solid red background; all others are ghost buttons
          that turn darker on hover. Using `p === page` as the condition is safe
          because both are numbers. */}
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition ${
            p === page
              ? 'bg-red-600 border-red-600 text-white font-semibold' // active page — red solid
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white' // inactive
          }`}
        >
          {p}
        </Link>
      ))}

      {/* ── Trailing ellipsis + jump to last page ────────────────────────────
          Mirror of the leading section — shown when the window doesn't reach
          the last page. A "…" gap appears when there's more than a 1-page gap
          between the window end and totalPages. */}
      {end < totalPages && (
        <>
          {/* Gap indicator — only when end and totalPages are not adjacent */}
          {end < totalPages - 1 && <span className="px-2 text-gray-600">…</span>}
          {/* Jump directly to the last page */}
          <Link
            href={buildHref(totalPages)}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* ── Next button ──────────────────────────────────────────────────────
          Active link when there are more pages after the current one.
          Dimmed, non-interactive span on the last page. */}
      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition"
        >
          Next →
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm rounded-lg bg-gray-800/40 border border-gray-700/40 text-gray-600 cursor-not-allowed">
          Next →
        </span>
      )}
    </div>
  );
}
