'use client';
// app/components/ui/CollaboratorPanel.tsx
// Shown on the story edit page — lets the author invite co-authors by username,
// see who has accepted/declined, and remove collaborators.
// Uses the existing /api/collaborators endpoints.

import { useEffect, useState } from 'react';
import Image from 'next/image';

type Collaborator = {
  id: number;
  accepted: boolean | null; // null = pending, true = accepted, false = declined
  user: {
    id: number;
    username: string;
    profile: { avatar: string | null } | null;
  };
};

type Props = { storyId: number };

export default function CollaboratorPanel({ storyId }: Props) {
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch current collaborators on mount
  useEffect(() => {
    fetch(`/api/collaborators?storyId=${storyId}`)
      .then((r) => r.json())
      .then((data) => setCollabs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId]);

  // Invite a new co-author by username
  const invite = async () => {
    if (!username.trim()) return;
    setInviting(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/collaborators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, inviteeUsername: username.trim() }),
    });
    const data = await res.json();
    setInviting(false);

    if (!res.ok) {
      setError(data.error ?? 'Failed to send invite.');
      return;
    }

    // Prepend the new collaborator to the list
    setCollabs((prev) => [data, ...prev]);
    setUsername('');
    setSuccess(`Invite sent to ${data.user.username}.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const statusBadge = (accepted: boolean | null) => {
    if (accepted === null)
      return (
        <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
          Pending
        </span>
      );
    if (accepted)
      return (
        <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
          ✓ Accepted
        </span>
      );
    return (
      <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
        Declined
      </span>
    );
  };

  return (
    <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold text-white">Co-authors</h2>
      </div>

      {/* Invite input */}
      <div className="flex gap-2 mb-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && invite()}
          placeholder="Invite by username…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
        />
        <button
          onClick={invite}
          disabled={inviting || !username.trim()}
          className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
        >
          {inviting ? '…' : 'Invite'}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      {success && <p className="text-green-400 text-xs mb-3">{success}</p>}

      {/* Collaborator list */}
      {loading ? (
        <p className="text-xs text-gray-600">Loading…</p>
      ) : collabs.length === 0 ? (
        <p className="text-xs text-gray-600">No co-authors yet. Invite someone above.</p>
      ) : (
        <div className="space-y-2">
          {collabs.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 py-2 border-b border-gray-800 last:border-0"
            >
              <div className="flex items-center gap-2">
                {/* Avatar or initial fallback */}
                {c.user.profile?.avatar ? (
                  <Image
                    src={c.user.profile.avatar}
                    alt={c.user.username}
                    width={28}
                    height={28}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center text-xs font-bold text-red-400 uppercase">
                    {c.user.username[0]}
                  </span>
                )}
                <span className="text-sm text-white font-medium">{c.user.username}</span>
              </div>
              {statusBadge(c.accepted)}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4">
        Accepted co-authors can edit this story. Invites appear in their{' '}
        <a href="/my-invites" className="text-red-400 hover:text-red-300 transition">
          My Invites
        </a>{' '}
        page.
      </p>
    </div>
  );
}
