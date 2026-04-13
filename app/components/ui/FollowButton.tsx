// app/components/ui/FollowButton.tsx
// Client component — shows a "Follow" or "Following" button on a user's profile page.
// Clicking it toggles the follow state by calling /api/follows (which also handles un-follow).
// 'use client' is required because this component uses React state and browser events.

'use client';
import { useState } from 'react';

// targetUserId    — the database ID of the user being followed
// initialFollowing — whether the current viewer is already following them (from the server)
type Props = { targetUserId: number; initialFollowing: boolean; };

export default function FollowButton({ targetUserId, initialFollowing }: Props) {
  // following — mirrors the actual follow state in the DB; starts from the server-side value
  const [following, setFollowing] = useState(initialFollowing);
  // loading — disables the button while the API request is in flight to prevent double-clicks
  const [loading, setLoading]     = useState(false);

  // Calls the follows API, which toggles follow/un-follow and sends notifications on new follows
  const toggle = async () => {
    setLoading(true);
    const res = await fetch('/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followingId: targetUserId }),
    });
    if (res.ok) {
      const data = await res.json();
      // Use the server's response to update state — don't just flip it locally in case of error
      setFollowing(data.following);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      // Style changes based on follow state: red = follow, dark = already following
      className={`px-5 py-2 text-sm font-semibold rounded-xl border transition disabled:opacity-50 ${
        following
          ? 'bg-gray-800 border-gray-600 text-gray-300 hover:border-red-600/50 hover:text-red-400'
          : 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
      }`}
    >
      {/* Show a loading ellipsis while the request is in flight */}
      {loading ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
