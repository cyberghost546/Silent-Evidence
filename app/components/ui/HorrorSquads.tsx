'use client';
// HorrorSquads.tsx
// Private horror groups where friends share stories with each other.
// Users can create squads, join with a 6-char code, and post inside their squads.
// Two tabs: "My Squads" and "Join a Squad"

import { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

// A squad summary shown in the "My Squads" list
type Squad = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  hostUsername: string;
  memberCount: number;
  createdAt: string;
};

// A single post inside a squad feed
type SquadPost = {
  id: number;
  content: string | null;
  storyUrl: string | null;
  createdAt: string;
  userId: number;
  username: string;
};

// Full squad detail shown in the squad feed view
type SquadDetail = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  host: { id: number; username: string };
  members: { userId: number; username: string; joinedAt: string }[];
  posts: SquadPost[];
};

// Props passed from the parent page
type Props = {
  userId: number | null; // null when logged out
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// Converts an ISO date string to a human-readable "time ago" label
// e.g. "2 hours ago", "3 days ago"
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function HorrorSquads({ userId }: Props) {
  // Which top-level tab the user is viewing: my squads or join flow
  const [tab, setTab] = useState<'mine' | 'join'>('mine');

  // List of squads the user belongs to
  const [squads, setSquads] = useState<Squad[]>([]);

  // The squad the user has "entered" — shows the feed view
  const [activeSquad, setActiveSquad] = useState<SquadDetail | null>(null);

  // Controls whether the create-squad form is visible
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state for creating a new squad
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Input for the join-by-code flow
  const [joinCode, setJoinCode] = useState('');

  // New post input inside the squad feed
  const [postContent, setPostContent] = useState('');
  const [postStoryUrl, setPostStoryUrl] = useState('');

  // General loading / error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [postLoading, setPostLoading] = useState(false);

  // ── Fetch user's squads ───────────────────────────────────────────────────

  // Loads all squads for the current user from the API
  const loadSquads = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/squads?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSquads(data.squads ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load squads when the component mounts or userId changes
  useEffect(() => {
    loadSquads();
  }, [loadSquads]);

  // ── Enter a squad (fetch full detail) ────────────────────────────────────

  // Called when the user clicks "Enter" on a squad card
  // Fetches the full squad detail including members and recent posts
  const enterSquad = async (code: string) => {
    setError('');
    const res = await fetch(`/api/squads/${code}`);
    if (res.ok) {
      const data = await res.json();
      setActiveSquad(data);
    } else {
      setError('Could not load squad.');
    }
  };

  // Go back to the squad list from the feed view
  const leaveSquadView = () => setActiveSquad(null);

  // ── Create a squad ────────────────────────────────────────────────────────

  const createSquad = async () => {
    if (!userId || !newName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, hostId: userId }),
      });
      if (res.ok) {
        // Reset the form and refresh the squad list
        setNewName('');
        setNewDesc('');
        setShowCreateForm(false);
        await loadSquads();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Could not create squad.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Join a squad ──────────────────────────────────────────────────────────

  const joinSquad = async () => {
    if (!userId || !joinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const code = joinCode.trim().toUpperCase();
      const res = await fetch(`/api/squads/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'join' }),
      });
      if (res.ok) {
        // Switch to "My Squads" tab and refresh the list to show the new squad
        setJoinCode('');
        setTab('mine');
        await loadSquads();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Could not join squad. Check your code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Post to a squad ───────────────────────────────────────────────────────

  // Submits a new post (message + optional story link) to the active squad
  const submitPost = async () => {
    if (!userId || !activeSquad) return;
    if (!postContent.trim() && !postStoryUrl.trim()) return;

    setPostLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/squads/${activeSquad.code}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          content: postContent.trim() || null,
          storyUrl: postStoryUrl.trim() || null,
        }),
      });
      if (res.ok) {
        const newPost: SquadPost = await res.json();
        // Prepend the new post to the local feed so the user sees it immediately
        setActiveSquad((prev) =>
          prev ? { ...prev, posts: [newPost, ...prev.posts] } : prev
        );
        setPostContent('');
        setPostStoryUrl('');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Could not post.');
      }
    } finally {
      setPostLoading(false);
    }
  };

  // ── Guard: not logged in ──────────────────────────────────────────────────

  if (!userId) {
    return (
      <div className="rounded-lg border border-green-900/40 bg-neutral-900/80 p-6 text-center text-green-400">
        {/* Prompt unauthenticated visitors to log in */}
        <p className="text-sm">Sign in to join or create a Horror Squad.</p>
      </div>
    );
  }

  // ── Squad feed view ───────────────────────────────────────────────────────

  // When a squad is active, replace the whole widget with the feed
  if (activeSquad) {
    return (
      <div className="rounded-lg border border-green-900/50 bg-neutral-950 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
        {/* Feed header: back button, squad name, share code */}
        <div className="flex items-center justify-between border-b border-green-900/40 px-4 py-3">
          <button
            onClick={leaveSquadView}
            className="text-xs text-green-500 hover:text-green-400 transition-colors"
          >
            ← Back to Squads
          </button>
          <h3 className="text-sm font-bold text-green-300 tracking-wide">{activeSquad.name}</h3>
          {/* Show the invite code so members can share it with friends */}
          <span className="rounded bg-green-950 px-2 py-0.5 font-mono text-xs text-green-400 border border-green-900/50">
            {activeSquad.code}
          </span>
        </div>

        {/* Member count + list */}
        <div className="border-b border-green-900/30 px-4 py-2">
          <p className="text-xs text-neutral-500">
            {activeSquad.members.length} member{activeSquad.members.length !== 1 ? 's' : ''}:{' '}
            <span className="text-neutral-400">
              {activeSquad.members.map((m) => m.username).join(', ')}
            </span>
          </p>
        </div>

        {/* Post composer — text input + optional story link */}
        <div className="border-b border-green-900/30 px-4 py-3 space-y-2">
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Share something with your squad..."
            rows={2}
            className="w-full resize-none rounded bg-neutral-900 border border-green-900/40 px-3 py-2
                       text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none
                       focus:border-green-700 transition-colors"
          />
          <div className="flex gap-2">
            <input
              type="url"
              value={postStoryUrl}
              onChange={(e) => setPostStoryUrl(e.target.value)}
              placeholder="Story URL (optional)"
              className="flex-1 rounded bg-neutral-900 border border-green-900/40 px-3 py-1.5
                         text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none
                         focus:border-green-700 transition-colors"
            />
            <button
              onClick={submitPost}
              disabled={postLoading || (!postContent.trim() && !postStoryUrl.trim())}
              className="rounded bg-green-800 px-4 py-1.5 text-sm font-semibold text-white
                         hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {postLoading ? 'Posting…' : 'Post'}
            </button>
          </div>
          {error && <p className="text-xs text-green-500">{error}</p>}
        </div>

        {/* Post feed — list of squad posts, newest first */}
        <div className="max-h-96 overflow-y-auto divide-y divide-green-900/20">
          {activeSquad.posts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-600">
              No posts yet. Be the first to share something with the squad.
            </p>
          ) : (
            activeSquad.posts.map((post) => (
              <div key={post.id} className="px-4 py-3 hover:bg-neutral-900/50 transition-colors">
                {/* Post author + timestamp */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-green-400">{post.username}</span>
                  <span className="text-xs text-neutral-600">{timeAgo(post.createdAt)}</span>
                </div>
                {/* Post message text */}
                {post.content && (
                  <p className="text-sm text-neutral-300 leading-relaxed">{post.content}</p>
                )}
                {/* Story link — rendered as a styled anchor */}
                {post.storyUrl && (
                  <a
                    href={post.storyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate rounded border border-green-900/40 bg-green-950/30
                               px-3 py-1.5 text-xs text-green-400 hover:text-green-300 hover:border-green-700
                               transition-colors"
                  >
                    {/* Link icon + truncated URL */}
 {post.storyUrl}
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Main widget (tab view) ────────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-green-900/50 bg-neutral-950 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
      {/* Widget header */}
      <div className="border-b border-green-900/40 px-4 py-3">
        <h2 className="text-sm font-bold tracking-widest text-green-500 uppercase">
          Horror Squads
        </h2>
        <p className="mt-0.5 text-xs text-neutral-500">Private groups for sharing horror stories with friends</p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-green-900/30">
        {/* "My Squads" tab */}
        <button
          onClick={() => { setTab('mine'); setError(''); }}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${
            tab === 'mine'
              ? 'border-b-2 border-green-600 text-green-400'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          My Squads
        </button>
        {/* "Join a Squad" tab */}
        <button
          onClick={() => { setTab('join'); setError(''); }}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${
            tab === 'join'
              ? 'border-b-2 border-green-600 text-green-400'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Join a Squad
        </button>
      </div>

      {/* Tab content area */}
      <div className="p-4">
        {error && (
          <p className="mb-3 rounded bg-green-950/40 border border-green-900/40 px-3 py-2 text-xs text-green-400">
            {error}
          </p>
        )}

        {/* ── MY SQUADS TAB ──────────────────────────────────────────────── */}
        {tab === 'mine' && (
          <div className="space-y-3">
            {/* Create Squad button — toggles the inline create form */}
            <button
              onClick={() => { setShowCreateForm((v) => !v); setError(''); }}
              className="w-full rounded border border-green-900/50 bg-green-950/30 py-2 text-xs
                         font-semibold text-green-400 hover:bg-green-950/60 hover:border-green-700
                         transition-colors"
            >
              {showCreateForm ? '✕ Cancel' : '+ Create a New Squad'}
            </button>

            {/* Inline create form — shown when showCreateForm is true */}
            {showCreateForm && (
              <div className="rounded border border-green-900/40 bg-neutral-900 p-3 space-y-2">
                <p className="text-xs font-semibold text-green-400 mb-1">New Squad</p>
                {/* Squad name input */}
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Squad name (e.g. Shonen Club)"
                  maxLength={60}
                  className="w-full rounded bg-neutral-800 border border-green-900/30 px-3 py-2
                             text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none
                             focus:border-green-700 transition-colors"
                />
                {/* Optional description */}
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  maxLength={200}
                  className="w-full resize-none rounded bg-neutral-800 border border-green-900/30
                             px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600
                             focus:outline-none focus:border-green-700 transition-colors"
                />
                <button
                  onClick={createSquad}
                  disabled={loading || !newName.trim()}
                  className="w-full rounded bg-green-800 py-2 text-sm font-bold text-white
                             hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors"
                >
                  {loading ? 'Creating…' : 'Create Squad'}
                </button>
              </div>
            )}

            {/* Loading skeleton while squads are being fetched */}
            {loading && !showCreateForm && (
              <p className="text-center text-xs text-neutral-600 py-4">Loading your squads…</p>
            )}

            {/* Empty state — no squads yet */}
            {!loading && squads.length === 0 && (
              <p className="text-center text-xs text-neutral-600 py-4">
                You haven&apos;t joined any squads yet. Create one or join with a code.
              </p>
            )}

            {/* Squad cards — one per squad the user belongs to */}
            {squads.map((squad) => (
              <div
                key={squad.id}
                // Violet glow border on each card
                className="rounded-lg border border-green-900/50 bg-neutral-900
                           shadow-[0_0_10px_rgba(139,92,246,0.1)] hover:shadow-[0_0_16px_rgba(139,92,246,0.25)]
                           transition-shadow p-3"
              >
                {/* Squad name + host */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-green-300">{squad.name}</p>
                    <p className="text-xs text-neutral-500">
                      by {squad.hostUsername} &bull; {squad.memberCount} member{squad.memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {/* Invite code badge */}
                  <span className="shrink-0 rounded bg-green-950 px-2 py-0.5 font-mono text-xs text-green-400 border border-green-900/50">
                    {squad.code}
                  </span>
                </div>
                {/* Optional description */}
                {squad.description && (
                  <p className="mt-1.5 text-xs text-neutral-500 line-clamp-2">{squad.description}</p>
                )}
                {/* Enter button — loads the squad feed view */}
                <button
                  onClick={() => enterSquad(squad.code)}
                  className="mt-2 rounded bg-green-900/40 border border-green-900/50 px-4 py-1.5
                             text-xs font-semibold text-green-400 hover:bg-green-900/70 hover:text-green-300
                             transition-colors"
                >
                  Enter ›
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── JOIN TAB ──────────────────────────────────────────────────── */}
        {tab === 'join' && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500">
              Enter the 6-character code your squad host shared with you.
            </p>
            {/* Code input + join button side by side */}
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ANIME7"
                maxLength={6}
                className="flex-1 rounded bg-neutral-900 border border-green-900/40 px-3 py-2
                           font-mono text-sm tracking-widest text-green-300 placeholder-neutral-600
                           uppercase focus:outline-none focus:border-green-700 transition-colors"
              />
              <button
                onClick={joinSquad}
                disabled={loading || joinCode.length !== 6}
                className="rounded bg-green-800 px-4 py-2 text-sm font-bold text-white
                           hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors"
              >
                {loading ? 'Joining…' : 'Join'}
              </button>
            </div>
            {/* Hint text below the input */}
            <p className="text-xs text-neutral-600">
              Codes are 6 characters, letters and numbers (e.g. ANIME7, MANGA9).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
