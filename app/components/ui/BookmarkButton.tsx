'use client';
// BookmarkButton.tsx
// Toggle button that saves or un-saves a story for the logged-in user.
// The server returns the new bookmarked state so we don't have to guess.

import { useState } from 'react';

// storyId      — database ID of the story to bookmark
// initialBookmarked — whether the current user has already bookmarked it (from server)
type Props = { storyId: number; initialBookmarked: boolean };

export default function BookmarkButton({ storyId, initialBookmarked }: Props) {
  // bookmarked — mirrors the DB state; toggled on each successful API call
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  // loading — disables the button while the API request is in flight
  const [loading, setLoading] = useState(false);

  // POSTs to /api/bookmarks; the API upserts/deletes and returns { bookmarked: bool }
  const toggle = async () => {
    setLoading(true);
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId }),
    });
    if (res.ok) {
      const data = await res.json();
      // Use the server's response instead of flipping locally to stay in sync
      setBookmarked(data.bookmarked);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this story'}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition ${
        bookmarked
          ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20'
          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-yellow-500/40 hover:text-yellow-400'
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        fill={bookmarked ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      {bookmarked ? 'Saved' : 'Save'}
    </button>
  );
}
