'use client';
// ReadingBadge.tsx
// Shows a "% read" progress bar at the bottom of a story card when the user has
// partially read that story. Reads from the same localStorage key that
// ReadingProgress.tsx writes: "reading-progress-{storyId}" → percentage string.
// Renders nothing if the user hasn't started reading or has finished (≥98%).

import { useEffect, useState } from 'react';

export default function ReadingBadge({ storyId }: { storyId: number }) {
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`reading-progress-${storyId}`);
      if (!raw) return;
      const pct = parseFloat(raw);
      if (Number.isFinite(pct) && pct > 2 && pct < 98) {
        setProgress(Math.round(pct));
      }
    } catch {
      // localStorage may be unavailable (private mode, browser restrictions)
    }
  }, [storyId]);

  if (progress === null) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0">
      {/* Track */}
      <div className="h-1 bg-gray-700/60 w-full" />
      {/* Fill */}
      <div
        className="h-1 bg-red-500 absolute bottom-0 left-0 transition-none"
        style={{ width: `${progress}%` }}
      />
      {/* Label */}
      <span className="absolute bottom-1.5 right-2 text-[10px] font-semibold text-red-400 bg-gray-900/80 px-1 rounded">
        {progress}%
      </span>
    </div>
  );
}
