'use client';
// app/components/ui/TagFollowButton.tsx
// Bell-icon button that lets a user follow or unfollow a tag.
// Uses optimistic UI — the UI updates instantly before the server responds,
// then reverts if the request fails.

import { useState } from 'react';

type Props = {
  tagSlug: string;         // URL slug of the tag (e.g. "supernatural")
  tagName: string;         // Human-readable tag name shown in aria-label
  initialFollowing: boolean; // Whether the current user already follows this tag
  initialCount: number;    // Total follower count fetched server-side
};

export default function TagFollowButton({
  tagSlug,
  tagName,
  initialFollowing,
  initialCount,
}: Props) {
  // Local follow state — starts from the server-side value
  const [following, setFollowing] = useState(initialFollowing);
  // Local follower count — optimistically incremented / decremented
  const [count, setCount] = useState(initialCount);
  // Prevents double-clicking while the request is in-flight
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (loading) return; // ignore rapid clicks
    setLoading(true);

    // Optimistic update — flip state immediately so UI feels instant
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setCount(prev => (wasFollowing ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/tags/${tagSlug}/follow`, {
        method: 'POST',
        credentials: 'include', // send session cookie
      });

      if (!res.ok) {
        // Request failed — revert the optimistic update
        setFollowing(wasFollowing);
        setCount(prev => (wasFollowing ? prev + 1 : prev - 1));
      }
      // On success, the server confirms the new state — our optimistic value is correct
    } catch {
      // Network error — revert
      setFollowing(wasFollowing);
      setCount(prev => (wasFollowing ? prev + 1 : prev - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Bell toggle button — changes appearance based on follow state */}
      <button
        onClick={handleToggle}
        disabled={loading}
        suppressHydrationWarning
        aria-label={following ? `Unfollow tag ${tagName}` : `Follow tag ${tagName}`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
          following
            ? // Currently following — filled red button
              'bg-red-600 border-red-600 text-white hover:bg-red-700'
            : // Not following — ghost button
              'bg-transparent border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400'
        } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {/* Bell icon — filled when following, outline when not */}
        {following ? (
          // Muted bell = following (click to unfollow)
          <span className="text-base leading-none">🔕</span>
        ) : (
          // Ring bell = not following (click to follow)
          <span className="text-base leading-none">🔔</span>
        )}
        <span>{following ? 'Following' : 'Follow'}</span>
      </button>

      {/* Follower count — shown separately so it doesn't jump inside the button */}
      {count > 0 && (
        <span className="text-xs text-gray-500 tabular-nums">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </div>
  );
}
