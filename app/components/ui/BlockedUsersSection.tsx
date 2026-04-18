'use client';
// ============================================================
// FILE: BlockedUsersSection.tsx
// PURPOSE: Settings panel section that lets the logged-in user block other
//          users by username, and view / unblock anyone already on their list.
//
// HOW IT WORKS:
//   1. On mount, useEffect fetches GET /api/user/block to load the current list.
//   2. The user types a username and clicks "Block" → POST /api/user/block.
//   3. On success, the list re-fetches so the newly blocked user appears.
//   4. Each list item has an "Unblock" button → DELETE /api/user/block.
//      The user is removed from local state immediately (optimistic update).
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Swap the API paths (/api/user/block) for your own routes.
//   - The "fetch on mount + refetch after mutation" pattern works for any
//     settings section that manages a list of related records.
//   - router.refresh() after unblocking forces the server component to re-run,
//     keeping any server-rendered parts of the page in sync.
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type BlockedUser = { id: number; username: string; profile: { avatar: string | null } | null };

export default function BlockedUsersSection() {
  const router = useRouter();
  const [blockedList, setBlockedList] = useState<BlockedUser[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load the current block list on mount
  useEffect(() => {
    fetch('/api/user/block')
      .then(r => r.json())
      .then(data => setBlockedList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const block = async () => {
    const username = input.trim();
    if (!username) return;
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/user/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Failed to block user'); return; }
    setInput('');
    setSuccess(`@${username} has been blocked.`);
    // Refresh list
    fetch('/api/user/block').then(r => r.json()).then(d => setBlockedList(Array.isArray(d) ? d : []));
  };

  const unblock = async (username: string) => {
    await fetch('/api/user/block', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    setBlockedList(prev => prev.filter(u => u.username !== username));
    router.refresh();
  };

  return (
    <div>
      {/* Block a new user by username */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setError(''); setSuccess(''); }}
          placeholder="Enter username to block…"
          suppressHydrationWarning
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
        />
        <button
          onClick={block}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {loading ? '…' : 'Block'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      {success && <p className="text-xs text-green-400 mb-3">{success}</p>}

      {/* Current block list */}
      {blockedList.length === 0 ? (
        <p className="text-sm text-gray-500">You haven&apos;t blocked anyone.</p>
      ) : (
        <ul className="space-y-2">
          {blockedList.map(u => (
            <li key={u.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <img
                  src={u.profile?.avatar ?? `https://ui-avatars.com/api/?name=${u.username}&background=dc2626&color=fff&size=32`}
                  alt={u.username}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="text-sm text-white">@{u.username}</span>
              </div>
              <button
                onClick={() => unblock(u.username)}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1 transition"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
