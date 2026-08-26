'use client';
/**
 * PinStoryButton.tsx
 *
 * PURPOSE:
 * A small toggle button that lets a profile owner pin or unpin one of their
 * stories so it appears at the top of their public profile page.
 *
 * RULES:
 *  - Only one story can be pinned at a time. Pinning a new story automatically
 *    replaces the previous pin (handled server-side by the API).
 *  - Clicking a pinned story's button unpins it (sends DELETE).
 *  - Clicking an unpinned story's button pins it (sends POST with the storyId).
 *
 * EVENT PROPAGATION:
 * This button is typically rendered *inside* a parent <Link> card component.
 * If the click event bubbled up, tapping "Pin" would also navigate to the story
 * page. We prevent that with e.preventDefault() + e.stopPropagation().
 *
 * AFTER SAVE:
 * We call router.refresh() instead of managing state locally because the pinned
 * story section is rendered by a Server Component — refreshing re-runs the server
 * fetch and updates the whole profile page without a full browser reload.
 *
 * Usage:
 *   <PinStoryButton storyId={story.id} isPinned={pinnedStoryId === story.id} />
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  /** The database ID of the story this button controls. */
  storyId: number;
  /** Whether this specific story is currently pinned on the user's profile. */
  isPinned: boolean;
};

export default function PinStoryButton({ storyId, isPinned }: Props) {
  // router — used to trigger a server-side refresh after the pin state changes
  const router = useRouter();

  // loading — true while the API request is in-flight; disables the button to
  // prevent accidental double-clicks and shows "…" as visual feedback.
  const [loading, setLoading] = useState(false);

  // ── handleClick ─────────────────────────────────────────────────────────────
  // The click handler is async so we can await the fetch before refreshing.
  const handleClick = async (e: React.MouseEvent) => {
    // Stop the click from bubbling up to the parent <Link> which would navigate
    // to the story page — we only want to toggle the pin, not navigate.
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);

    if (isPinned) {
      // The story is currently pinned — send DELETE to unpin it.
      // The API clears the pinnedStoryId field on the user's profile.
      await fetch('/api/user/pinned-story', { method: 'DELETE' });
    } else {
      // The story is not pinned — send POST with the storyId to pin it.
      // The API sets pinnedStoryId = storyId (overwriting any previous pin).
      await fetch('/api/user/pinned-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      });
    }

    setLoading(false);

    // Refresh the current route — Next.js re-runs the Server Component data fetch
    // and updates the DOM without a full page reload. This is how we pick up the
    // updated pinned section without prop-drilling a state setter all the way up.
    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      // disabled while the request is in-flight to prevent double-clicks
      disabled={loading}
      // title provides a tooltip that describes the current action on hover
      title={isPinned ? 'Unpin story' : 'Pin to top of profile'}
      className={`text-xs px-2 py-0.5 rounded border transition flex-shrink-0 ${
        isPinned
          ? // Pinned state — gold-tinted border and text to match the 📌 icon
            'border-yellow-500/60 text-yellow-400 hover:bg-yellow-500/10'
          : // Unpinned state — neutral grey that warms to gold on hover
            'border-gray-700 text-gray-500 hover:border-yellow-500/40 hover:text-yellow-400'
      } disabled:opacity-40`}
    >
      {/* Label: "…" while loading, then "📌 Unpin" or "📌 Pin" based on current state */}
      {loading ? '…' : isPinned ? 'Unpin' : 'Pin'}
    </button>
  );
}
