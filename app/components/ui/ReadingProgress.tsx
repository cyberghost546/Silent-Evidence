'use client';
/**
 * ReadingProgress.tsx
 *
 * WHAT THIS FILE DOES:
 * Displays a thin red progress bar pinned to the very top of the browser window.
 * As the user scrolls down a story the bar grows from left to right showing how
 * far through the content they are (0% = top, 100% = bottom).
 *
 * Bonus feature: when a storyId is provided the user's scroll position is saved
 * in localStorage so if they leave and come back the page auto-scrolls to where
 * they stopped. When they reach >=98% the saved position is deleted so next time
 * they start fresh from the top.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Place <ReadingProgress /> inside any long-form page (article, blog post, etc.)
 * 2. Pass storyId (or any unique numeric ID) to enable the "resume reading" feature.
 * 3. The bar uses Tailwind — change "bg-red-500" to any color you like.
 *
 * Example usage:
 *   <ReadingProgress storyId={42} />
 *   <ReadingProgress />   ← no persistence, just the visual bar
 */

import { useEffect, useState } from 'react';

// ReadingProgress — the component. Accepts an optional storyId prop.
export default function ReadingProgress({ storyId }: { storyId?: number }) {
  // progress — a number 0–100 representing how far the user has scrolled.
  // It's stored in React state so changing it triggers a re-render (updates the bar width).
  const [progress, setProgress] = useState(0);

  // storageKey — the localStorage key for persisting scroll position for THIS story.
  // If storyId is not given (undefined or null) we set this to null and skip persistence.
  // Example key: "reading-progress-42"
  const storageKey = storyId != null ? `reading-progress-${storyId}` : null;

  // ── Effect 1: Restore saved scroll position on first render ──────────────────
  // This runs once when the component mounts (because the dependency is storageKey
  // which only changes if storyId changes, which never happens on a story page).
  useEffect(() => {
    // If no storageKey, skip — nothing to restore
    if (!storageKey) return;

    // localStorage.getItem returns null if the key doesn't exist, so we default to '0'
    const saved = parseFloat(localStorage.getItem(storageKey) ?? '0');

    // Only restore if there is a real saved position (> 0) and the story isn't already complete (< 100)
    if (saved > 0 && saved < 100) {
      // Convert the saved percentage back to an absolute pixel scroll offset:
      // total scrollable pixels = scrollHeight (full document height) minus innerHeight (visible area)
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      // behavior: 'instant' means no animation — jumps immediately so the user sees their spot
      window.scrollTo({ top: (saved / 100) * docHeight, behavior: 'instant' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // ── Effect 2: Track scroll position and update the bar + localStorage ─────────
  useEffect(() => {
    // This inner function runs every time the user scrolls
    function update() {
      const scrollTop = window.scrollY; // How many pixels they've scrolled from the top
      // Total scrollable distance = document height minus the visible viewport height
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      // Calculate percentage: 0 at top, 100 at bottom. Guard against 0 to avoid division errors.
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      // Update the React state — this causes the bar width to update in the DOM
      setProgress(pct);

      // If we have a storageKey, persist the position to localStorage
      if (storageKey) {
        if (pct >= 98) {
          // User has basically finished — remove the saved key so next visit starts fresh
          localStorage.removeItem(storageKey);
        } else {
          // Save the current % as a string (localStorage only stores strings)
          localStorage.setItem(storageKey, String(pct));
        }
      }
    }

    // { passive: true } tells the browser this listener won't call preventDefault(),
    // which allows the browser to optimise scrolling performance significantly
    window.addEventListener('scroll', update, { passive: true });

    // Cleanup: remove the listener when the component unmounts so we don't leak memory
    return () => window.removeEventListener('scroll', update);
  }, [storageKey]); // Re-run if storageKey changes (i.e., different story)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    // Outer div: fixed to the top of the viewport, spans the full width, 2px tall.
    // z-50 keeps it above other content. bg-transparent so the unfilled part is invisible.
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent">
      {/* Inner div: the red filled portion. Width is set inline from state.
          transition-[width] duration-75 makes the bar grow smoothly as the user scrolls. */}
      <div
        className="h-full bg-red-500 transition-[width] duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
