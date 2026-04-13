'use client';
// FollowListModal.tsx
// Renders a clickable "N followers" or "N following" stat.
// When clicked it opens a modal that fetches and lists the users.

import Link from 'next/link';
import { useState } from 'react';

type User = { username: string; avatar: string };

type Props = {
  username: string;         // whose profile we're on
  type: 'followers' | 'following';
  count: number;
};

export default function FollowListModal({ username, type, count }: Props) {
  const [open, setOpen]     = useState(false);
  const [users, setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const label = type === 'followers' ? 'followers' : 'following';

  // Fetch the list the first time the modal opens
  const handleOpen = async () => {
    setOpen(true);
    if (users.length > 0) return; // already loaded
    setLoading(true);
    try {
      const res  = await fetch(`/api/user/${username}/${type}`);
      const json = await res.json();
      if (res.ok) setUsers(json.users);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Clickable stat — looks the same as the other profile stats */}
      <button
        onClick={handleOpen}
        className="hover:text-white transition cursor-pointer"
      >
        <span className="text-white font-semibold">{count}</span>{' '}
        <span className="text-gray-500">{label}</span>
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)} // close when clicking the backdrop
        >
          {/* Modal panel — stop click from bubbling to backdrop */}
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white capitalize">{label}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
              {loading && (
                <p className="text-center text-gray-500 py-8">Loading…</p>
              )}

              {!loading && users.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No {label} yet.
                </p>
              )}

              {/* User rows */}
              {users.map((u) => (
                <Link
                  key={u.username}
                  href={`/user/${u.username}`}
                  onClick={() => setOpen(false)} // close modal when navigating
                  className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-800 transition"
                >
                  <img
                    src={u.avatar}
                    alt={u.username}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                  <span className="text-white font-medium text-sm">{u.username}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
