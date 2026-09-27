'use client';
/**
 * ReadingTracker.tsx
 *
 * WHAT THIS FILE DOES:
 * An invisible component that records a "read" in the user's reading history
 * after they have been on a story page for at least 10 seconds. The delay
 * prevents a quick click-then-back from being counted as a genuine read.
 *
 * Under the hood it simply fires a POST to /api/reading-history with the
 * storyId. The API adds or updates a ReadingHistory record for the current
 * session user. This powers the "Continue Reading" / history features.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Place <ReadingTracker storyId={story.id} /> anywhere inside your article
 *    or long-form page — it renders nothing visible.
 * 2. Adjust the 10_000 ms delay up or down depending on how you define a "read".
 * 3. Replace the API endpoint with your own analytics / history route.
 *
 * Example usage:
 *   <ReadingTracker storyId={42} />
 */

import { useEffect } from 'react';

// The component takes only the numeric database ID of the story being read.
export default function ReadingTracker({ storyId }: { storyId: number }) {
  // useEffect runs after the component mounts (i.e. when the story page loads).
  // The dependency array [storyId] means: if the user somehow navigates to a
  // different story without unmounting (e.g. SPA routing), the timer resets.
  useEffect(() => {
    // Start a 10-second timer. We wait 10s before logging the read so that
    // someone who bounces immediately (clicked the wrong link, pressed Back)
    // does NOT get counted in their history.
    const timer = setTimeout(() => {
      fetch('/api/reading-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      }).catch(() => {});
      // .catch(() => {}) silently swallows any network errors — reading history
      // is non-critical and should never break the page if the request fails.
    }, 10_000); // 10 000 ms = 10 seconds

    // Cleanup function: if the component unmounts before 10 seconds have passed
    // (e.g. user navigates away quickly) we cancel the timer so the API is
    // never called for that partial visit.
    return () => clearTimeout(timer);
  }, [storyId]);

  // This component has no visible output — it exists purely for its side-effect.
  return null;
}
