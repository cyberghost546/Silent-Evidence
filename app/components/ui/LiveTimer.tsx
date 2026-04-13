'use client';
// LiveTimer.tsx
// Displays a human-readable relative timestamp that refreshes automatically.
// e.g. "3m ago", "2h ago", "5d ago", or a full date for very old posts.
// Used on story cards, forum posts, and any place that shows a posted-at time.
//
// Props:
//   iso — ISO 8601 timestamp string (e.g. "2025-04-01T10:30:00.000Z")

import { useState, useEffect } from 'react';

// Converts an ISO timestamp to a compact relative label.
// Refreshes every 30 seconds in the parent effect, so the label stays accurate.
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60)   return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)   return `${days}d ago`;
  // For anything older than 30 days, show the full date instead
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LiveTimer({ iso }: { iso: string }) {
  // The formatted label string — starts empty to avoid SSR/client mismatch
  const [label, setLabel] = useState('');

  useEffect(() => {
    // Set immediately on mount, then re-compute every 30 seconds
    setLabel(timeAgo(iso));
    const id = setInterval(() => setLabel(timeAgo(iso)), 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    // suppressHydrationWarning prevents React from complaining about the
    // intentional server/client mismatch (empty string on server, time string on client)
    <span className="inline-flex items-center gap-1 text-xs text-gray-500" suppressHydrationWarning>
      {/* Clock icon */}
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
      </svg>
      {label}
    </span>
  );
}
