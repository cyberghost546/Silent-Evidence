'use client';
// =============================================================================
// LiveTimer.tsx  —  CLIENT COMPONENT
// =============================================================================
// Purpose:
//   Displays a compact human-readable relative timestamp that updates automatically
//   every 30 seconds so it stays accurate without a page refresh.
//   Examples: "12s ago", "3m ago", "2h ago", "5d ago", "Apr 1, 2025"
//
// Usage:
//   <LiveTimer iso="2025-04-01T10:30:00.000Z" />
//   Pass any ISO 8601 timestamp string. The component handles the conversion and
//   auto-refresh internally.
//
// Props:
//   iso — ISO 8601 timestamp string, e.g. story.createdAt (serialised from Prisma Date)
//
// Architecture notes:
//   - 'use client' is required because this component uses useState and setInterval.
//   - The label state starts as an empty string '' on both server and client.
//     On the server there is no Date.now() so we render nothing, then the client
//     fills in the real value immediately after mount. suppressHydrationWarning on
//     the <span> prevents React from throwing a hydration mismatch error for this
//     intentional server/client divergence.
//   - 30-second refresh interval matches the granularity of the "Xm ago" format —
//     re-computing more often would be wasted work since the output doesn't change
//     within a 1-minute window.
// =============================================================================

import { useState, useEffect } from 'react';

// ── timeAgo: ISO timestamp → compact relative label ──────────────────────────
// Converts a millisecond difference into the most appropriate human-readable unit.
// Falls back to a full locale date string for timestamps older than 30 days
// because "47 days ago" is less readable than "Mar 15, 2025".
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime(); // ms since the event
  const secs = Math.floor(diff / 1000);
  if (secs < 60)  return `${secs}s ago`;             // 0–59 seconds
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins}m ago`;             // 1–59 minutes
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;              // 1–23 hours
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;             // 1–29 days
  // 30+ days: show the full date for clarity
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function LiveTimer({ iso }: { iso: string }) {

  // ── State ─────────────────────────────────────────────────────────────────
  // label starts as '' (empty string) so that server-rendered HTML and the
  // initial client render match exactly — avoiding a React hydration warning.
  // The useEffect below immediately sets the real value after first mount.
  const [label, setLabel] = useState('');

  // ── Side effect: compute initial label + set up refresh interval ──────────
  useEffect(() => {
    // Set the label immediately on mount (no waiting for the first interval tick).
    setLabel(timeAgo(iso));

    // Re-compute every 30 seconds so the displayed time stays accurate.
    // For example, a post that was "just now" will update to "1m ago" after 60s.
    const id = setInterval(() => setLabel(timeAgo(iso)), 30_000);

    // Cleanup: stop the interval when this component is unmounted (e.g. when the
    // story card is filtered out or the page changes). Prevents state updates on
    // unmounted components (React warns about this in development mode).
    return () => clearInterval(id);
  }, [iso]);
  // [iso] as the dependency: if the prop changes (e.g. live-updating feed),
  // the effect re-runs and restarts the interval for the new timestamp.

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // inline-flex gap-1 — keeps the clock icon and text on the same line
    // without needing a manual margin between them.
    //
    // suppressHydrationWarning — necessary here because label is '' on the server
    // but a real time string on the client. React would normally flag this as a
    // hydration error; suppressing it is safe because the discrepancy is intentional
    // and very brief (resolved within milliseconds of mount).
    <span
      className="inline-flex items-center gap-1 text-xs text-gray-500"
      suppressHydrationWarning
    >
      {/* Clock icon — decorative visual affordance that the text is a timestamp.
          flex-shrink-0 prevents the icon from being squashed if the parent
          container is very narrow. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-3 h-3 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {/* Heroicons "clock" path — circle with hour/minute hands */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"
        />
      </svg>

      {/* The formatted relative label — updated by the interval above */}
      {label}
    </span>
  );
}
