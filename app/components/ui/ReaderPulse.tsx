'use client';
// app/components/ui/ReaderPulse.tsx
// Displays a live "X reading now" indicator on a story card.
// Polls GET /api/stories/presence?storyId=X every 30 seconds.
// Renders nothing when the count is 0, so it's invisible on low-traffic stories.

import { useEffect, useState } from 'react';

type Props = {
  storyId: number; // database ID of the story to watch
};

// POLL_INTERVAL — how often we re-fetch the reader count, in milliseconds
const POLL_INTERVAL = 30_000; // 30 seconds

export default function ReaderPulse({ storyId }: Props) {
  // count — current number of active readers (null = not yet loaded)
  const [count, setCount] = useState<number | null>(null);

  // fetchCount — calls the presence API and updates state
  async function fetchCount() {
    try {
      const res = await fetch(`/api/stories/presence?storyId=${storyId}`, {
        // cache: 'no-store' ensures we always get a fresh count
        cache: 'no-store',
      });
      if (!res.ok) return; // silently ignore errors — this is non-critical UI
      const data = await res.json() as { count: number };
      setCount(data.count ?? 0);
    } catch {
      // Network errors are swallowed — the indicator just won't show
    }
  }

  useEffect(() => {
    // Fetch immediately on mount so there's no blank period
    fetchCount();

    // Then poll on the interval — keep the count fresh without hammering the server
    const timer = setInterval(fetchCount, POLL_INTERVAL);

    // Clear the interval when the component unmounts (e.g. navigating away)
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Render nothing until we have a real count, or if no one is reading
  if (count === null || count === 0) return null;

  return (
    // Inline indicator — designed to sit inside a story card alongside other meta
    <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
      {/* Pulsing green dot — the CSS animation is defined in globals.css via Tailwind */}
      <span className="relative flex h-2 w-2">
        {/* Outer ping ring — expands and fades */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
        {/* Inner solid dot */}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>

      {/* "X reading now" — pluralise "person" correctly */}
      {count === 1 ? '1 reading now' : `${count} reading now`}
    </span>
  );
}
