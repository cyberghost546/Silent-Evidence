'use client';
// app/components/ui/CoAuthorInvite.tsx
// Client component — lets a story's author invite co-authors by username,
// and displays the current collaborators with their accept/decline status.

import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

// Shape of a collaborator record returned by GET /api/collaborators
interface Collaborator {
  id: number;
  accepted: boolean | null; // null = pending, true = accepted, false = declined
  createdAt: string;
  user: {
    id: number;
    username: string;
    profile: { avatar: string | null } | null;
  };
}

// Props: storyId identifies which story to manage; authorId is the logged-in user
interface Props {
  storyId: number;
  authorId: number;
}

export default function CoAuthorInvite({ storyId, authorId }: Props) {
  // ── State ─────────────────────────────────────────────────────────────────

  // List of current collaborators fetched from the API
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // The username typed into the invite input field
  const [username, setUsername] = useState('');

  // Error / success feedback messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Loading flags — prevents double submissions and shows loading state
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  // Load collaborators whenever storyId changes (normally just on mount)
  useEffect(() => {
    fetchCollaborators();
  }, [storyId]);

  async function fetchCollaborators() {
    setLoading(true);
    try {
      const res = await fetch(`/api/collaborators?storyId=${storyId}`);
      const data = await res.json();
      setCollaborators(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch collaborators', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Invite handler ─────────────────────────────────────────────────────────

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }

    setInviting(true);

    try {
      const res = await fetch('/api/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          inviterId: authorId,
          inviteeUsername: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Surface the API's error message (e.g. "User not found", "Already invited")
        setError(data.error ?? 'Invite failed. Please try again.');
        return;
      }

      // Invite sent — optimistically prepend the new collaborator to the list
      // so the UI reflects the change without a full re-fetch.
      setCollaborators((prev) => [data, ...prev]);
      setUsername(''); // clear the input
      setSuccess(`Invite sent to ${trimmed}!`);
    } catch (err) {
      console.error('Invite error', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setInviting(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Map the accepted boolean (or null) to a human-readable label and colour class
  function statusLabel(accepted: boolean | null): { text: string; cls: string } {
    if (accepted === null) return { text: 'Pending',  cls: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40' };
    if (accepted === true)  return { text: 'Accepted', cls: 'text-green-400 bg-green-900/30 border-green-700/40'  };
    return                         { text: 'Declined', cls: 'text-red-400 bg-red-900/30 border-red-700/40'         };
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
 Co-Author Mode
        </h3>
        {/* Informational note about what co-authorship means */}
        <p className="text-xs text-gray-500 mt-1">
          Co-authors can edit this story. Invitees will need to accept the invite.
        </p>
      </div>

      {/* ── Invite form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleInvite} className="flex gap-2">
        {/* Username input */}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Invite by username…"
          className="
            flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg
            px-3 py-2 text-sm focus:outline-none focus:border-green-600
            placeholder-gray-600 transition
          "
        />

        {/* Invite submit button */}
        <button
          type="submit"
          disabled={inviting}
          className="
            bg-green-700 hover:bg-green-600 disabled:opacity-50
            text-white text-sm font-semibold px-4 py-2 rounded-lg transition
            whitespace-nowrap
          "
        >
          {inviting ? 'Inviting…' : 'Invite Co-Author'}
        </button>
      </form>

      {/* Feedback messages — shown for one action at a time */}
      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-400 bg-green-900/20 border border-green-800/40 rounded-lg px-3 py-2">
          {success}
        </p>
      )}

      {/* ── Collaborator list ────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Current Co-Authors</p>

        {loading ? (
          // Skeleton loading state while the API call is in flight
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-10 bg-gray-800/60 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : collaborators.length === 0 ? (
          // Empty state
          <p className="text-gray-600 text-sm italic">No co-authors invited yet.</p>
        ) : (
          <ul className="space-y-2">
            {collaborators.map((c) => {
              const { text, cls } = statusLabel(c.accepted);

              // Build avatar URL — fall back to a generated initials avatar
              const avatar =
                c.user.profile?.avatar ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user.username)}&background=4c1d95&color=fff&size=64`;

              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 bg-gray-800/40 border border-gray-800 rounded-lg px-3 py-2.5"
                >
                  {/* Small avatar thumbnail */}
                  <img
                    src={avatar}
                    alt={c.user.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-700"
                  />

                  {/* Username */}
                  <span className="text-sm text-white font-medium flex-1">
                    @{c.user.username}
                  </span>

                  {/* Status badge — colour-coded by accepted value */}
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}
                  >
                    {text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
