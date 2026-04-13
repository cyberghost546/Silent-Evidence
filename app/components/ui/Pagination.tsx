// app/components/ui/Pagination.tsx
// Reusable pagination bar used on any listing page (search results, category pages, etc.).
//
// Props:
//   page        — the current page number (1-based, so page 1 is the first page)
//   totalPages  — how many pages exist in total
//   buildHref   — a function the parent provides that turns a page number into a URL string.
//                 Using a function here keeps the Pagination component generic — it doesn't
//                 need to know anything about the URL structure of the page it's on.
//
// The component shows at most 5 page number buttons centred around the current page,
// plus "…" ellipsis links to jump to page 1 or the last page when they're out of range.
// "Prev" and "Next" buttons are rendered as unclickable dimmed spans when at the boundary.

import Link from 'next/link';

type Props = {
  page: number;       // which page the user is currently on (starts at 1)
  totalPages: number; // total number of pages available
  buildHref: (page: number) => string; // converts a page number into a full URL string
};

export default function Pagination({ page, totalPages, buildHref }: Props) {
  // Don't render anything at all if there's only one page — no point showing navigation
  if (totalPages <= 1) return null;

  // Build the list of page numbers to show as clickable buttons.
  // We show at most 5 numbers: up to 2 before and 2 after the current page.
  // Math.max/min clamp the range so we don't go below 1 or above totalPages.
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-12">

      {/* ── Prev button ──────────────────────────────────────────────────────
          Active (clickable) link when not on page 1.
          Dimmed non-clickable span when already on the first page. */}
      {page > 1 ? (
        <Link href={buildHref(page - 1)}
          className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition">
          ← Prev
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm rounded-lg bg-gray-800/40 border border-gray-700/40 text-gray-600 cursor-not-allowed">← Prev</span>
      )}

      {/* ── Jump-to-first + leading ellipsis ─────────────────────────────────
          Only shown when the visible window doesn't include page 1.
          An extra "…" separator appears when page 1 is more than one step away. */}
      {start > 1 && (
        <>
          <Link href={buildHref(1)} className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition">1</Link>
          {start > 2 && <span className="px-2 text-gray-600">…</span>}
        </>
      )}

      {/* ── Numbered page buttons ─────────────────────────────────────────────
          The current page gets a red highlight so it's easy to spot.
          All other pages are grey until hovered. */}
      {pages.map(p => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition ${
            p === page
              ? 'bg-red-600 border-red-600 text-white font-semibold' // active page
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {p}
        </Link>
      ))}

      {/* ── Trailing ellipsis + jump-to-last ─────────────────────────────────
          Mirror of the leading section — only shown when the last page is out of range. */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-2 text-gray-600">…</span>}
          <Link href={buildHref(totalPages)} className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition">{totalPages}</Link>
        </>
      )}

      {/* ── Next button ──────────────────────────────────────────────────────
          Active when there are more pages after the current one.
          Dimmed non-clickable span on the last page. */}
      {page < totalPages ? (
        <Link href={buildHref(page + 1)}
          className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition">
          Next →
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm rounded-lg bg-gray-800/40 border border-gray-700/40 text-gray-600 cursor-not-allowed">Next →</span>
      )}
    </div>
  );
}
