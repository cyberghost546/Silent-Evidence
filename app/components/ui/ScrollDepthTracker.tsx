'use client';
// ScrollDepthTracker.tsx
// Invisible component that watches how far a logged-in user scrolls through a story
// and reports the furthest point reached back to /api/reading-history.
//
// HOW IT WORKS:
//   • Listens to the window scroll event (throttled to once per 300ms).
//   • Calculates scroll % as: scrollY / (documentHeight - viewportHeight) × 100.
//   • Posts to /api/reading-history with { storyId, progress } at the 25 / 50 / 75 / 100
//     percent milestones so the author's analytics can show an avg completion rate.
//   • Only ever increases the stored progress — scrolling back up doesn't lower the score.
//   • Fires a final flush on page hide (tab close / navigation away) to capture the
//     user's last position even if they never hit a milestone.
//
// PLACEMENT:
//   Drop <ScrollDepthTracker storyId={story.id} /> anywhere on the story page.
//   It renders nothing visible — it only exists for its scroll-tracking side-effect.

import { useEffect, useRef } from 'react';

const MILESTONES = [25, 50, 75, 100];

export default function ScrollDepthTracker({ storyId }: { storyId: number }) {
  // Track the highest progress % we've already reported so we never send a lower value
  const reported = useRef(0);

  useEffect(() => {
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    function getScrollPct(): number {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return 100;
      return Math.min(100, Math.round((scrolled / total) * 100));
    }

    function reportProgress(pct: number) {
      if (pct <= reported.current) return;
      reported.current = pct;
      fetch('/api/reading-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, progress: pct }),
      }).catch(() => {});
    }

    function onScroll() {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        const pct = getScrollPct();
        // Only fire at milestones to reduce API noise
        const hit = MILESTONES.find((m) => pct >= m && m > reported.current);
        if (hit !== undefined) reportProgress(hit);
      }, 300);
    }

    // Flush whatever progress was reached when the user leaves the page
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        reportProgress(getScrollPct());
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [storyId]);

  return null;
}
