'use client';
// app/components/ui/CurrentlyReadingBadge.tsx
// Shows a small "N reading now" indicator on story cards.
// Fetches the active reader count once on mount — no polling needed for cards.
// Uses the existing /api/stories/presence?storyId= endpoint.

import { useEffect, useState } from 'react';

type Props = { storyId: number };

export default function CurrentlyReadingBadge({ storyId }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/stories/presence?storyId=${storyId}`)
      .then(r => r.json())
      .then(data => setCount(data.count ?? 0))
      .catch(() => {});
  }, [storyId]);

  // Only show the badge when at least 2 people are reading (1 could just be the viewer)
  if (count === null || count < 2) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2 py-0.5">
      {/* Pulsing green dot */}
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
      </span>
      {count} reading
    </span>
  );
}
