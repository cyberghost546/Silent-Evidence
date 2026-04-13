'use client';
// PinStoryButton.tsx
// Shown on your own profile next to each story.
// Clicking it pins or unpins that story at the top of your profile.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  storyId: number;
  isPinned: boolean; // true when this story is currently the pinned one
};

export default function PinStoryButton({ storyId, isPinned }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    // Prevent the parent <Link> from navigating when clicking this button
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    if (isPinned) {
      // Unpin — clear the pinned story
      await fetch('/api/user/pinned-story', { method: 'DELETE' });
    } else {
      // Pin this story
      await fetch('/api/user/pinned-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      });
    }

    setLoading(false);
    // Refresh the page so the pinned section updates
    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isPinned ? 'Unpin story' : 'Pin to top of profile'}
      className={`text-xs px-2 py-0.5 rounded border transition flex-shrink-0 ${
        isPinned
          ? 'border-yellow-500/60 text-yellow-400 hover:bg-yellow-500/10'
          : 'border-gray-700 text-gray-500 hover:border-yellow-500/40 hover:text-yellow-400'
      } disabled:opacity-40`}
    >
      {loading ? '…' : isPinned ? '📌 Unpin' : '📌 Pin'}
    </button>
  );
}
