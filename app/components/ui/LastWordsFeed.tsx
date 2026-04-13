'use client';
// ============================================================
//  LastWordsFeed.tsx
//  Anime quote micro-post feed — users post their favorite
//  anime quotes (max 280 chars). Like a quote-themed Twitter feed.
//
//  Props:
//    userId — the currently logged-in user's id, or null if guest
//
//  NOTE: Component name kept as LastWordsFeed so existing API
//  routes and imports continue to work without refactoring.
// ============================================================

import { useState, useEffect, useRef } from 'react';

// ── Type definitions ─────────────────────────────────────────

// Shape of a single post as returned by GET /api/last-words
type LastWord = {
  id: number;
  content: string;
  createdAt: string;       // ISO string
  likes: number;
  user: {
    username: string;
    avatar: string;        // ui-avatars URL or profile avatar
  };
};

// Track per-post like state locally so hearts update instantly
// without waiting for a server round-trip to re-fetch the whole list.
type LikeState = {
  liked: boolean;   // has the current user liked this post?
  likes: number;    // current total like count
};

// Component props
type Props = {
  userId: number | null;  // null = unauthenticated guest
};

// ── Helper: human-readable relative time ────────────────────
// Converts an ISO timestamp to e.g. "2 hours ago", "just now"
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  // Fall back to a locale date string for very old posts
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Main Component ───────────────────────────────────────────
// Kept as LastWordsFeed to preserve API route compatibility
export default function LastWordsFeed({ userId }: Props) {
  // The ordered list of posts fetched from the API
  const [words, setWords] = useState<LastWord[]>([]);

  // Per-post like state keyed by post id
  const [likeStates, setLikeStates] = useState<Record<number, LikeState>>({});

  // The textarea input value (user's draft post)
  const [draft, setDraft] = useState('');

  // Loading flags for the initial fetch and the submit action
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Error message to show under the input if something goes wrong
  const [error, setError] = useState('');

  // Set of post ids that were just added in this session so we can
  // apply a fade-in CSS animation only to newly created posts.
  const newIds = useRef<Set<number>>(new Set());

  // Maximum characters allowed for a quote post
  const MAX_CHARS = 280;
  const charsLeft = MAX_CHARS - draft.length;

  // ── Fetch posts on mount ─────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        // Fetch all existing quotes from the API endpoint
        const res = await fetch('/api/last-words');
        if (!res.ok) throw new Error('Fetch failed');
        const data: LastWord[] = await res.json();
        setWords(data);

        // Initialise like state for every fetched post.
        // We don't know server-side which the current user liked,
        // so start with liked: false — the user can re-toggle.
        const initial: Record<number, LikeState> = {};
        for (const w of data) {
          initial[w.id] = { liked: false, likes: w.likes };
        }
        setLikeStates(initial);
      } catch {
        // Show a friendly error if the feed can't be loaded
        setError('Could not load the feed. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Submit a new quote ───────────────────────────────────
  async function handleSubmit() {
    // Guard: must be authenticated to post
    if (!userId) {
      setError('You must be logged in to post quotes.');
      return;
    }
    const trimmed = draft.trim();
    // Guard: don't allow empty submissions
    if (!trimmed) {
      setError('Write something first...');
      return;
    }
    // Guard: enforce character limit
    if (trimmed.length > MAX_CHARS) {
      setError(`Keep it to ${MAX_CHARS} characters or fewer.`);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // POST the new quote to the API
      const res = await fetch('/api/last-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, userId }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to post. Try again!');
      }

      const newWord: LastWord = await res.json();

      // Mark this id so the card gets the fade-in animation class
      newIds.current.add(newWord.id);

      // Prepend the new post to the top of the feed (newest first)
      setWords((prev) => [newWord, ...prev]);

      // Initialise its like state
      setLikeStates((prev) => ({
        ...prev,
        [newWord.id]: { liked: false, likes: 0 },
      }));

      // Clear the textarea after successful post
      setDraft('');
    } catch (err: unknown) {
      // Display the server error message or a generic fallback
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again!');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Toggle like on a post ────────────────────────────────
  async function handleLike(wordId: number) {
    // Guard: must be authenticated to like
    if (!userId) {
      setError('Log in to like quotes.');
      return;
    }

    // Optimistic update — flip liked immediately so the UI feels snappy
    setLikeStates((prev) => {
      const cur = prev[wordId] ?? { liked: false, likes: 0 };
      return {
        ...prev,
        [wordId]: {
          liked: !cur.liked,
          likes: cur.liked ? cur.likes - 1 : cur.likes + 1,
        },
      };
    });

    try {
      // Send the like toggle to the server
      const res = await fetch(`/api/last-words/${wordId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error('Like failed');

      // Sync with authoritative server response
      const { liked, likes }: { liked: boolean; likes: number } = await res.json();
      setLikeStates((prev) => ({ ...prev, [wordId]: { liked, likes } }));
    } catch {
      // Roll back the optimistic update on failure
      setLikeStates((prev) => {
        const cur = prev[wordId] ?? { liked: false, likes: 0 };
        return {
          ...prev,
          [wordId]: {
            liked: !cur.liked,
            likes: cur.liked ? cur.likes + 1 : cur.likes - 1,
          },
        };
      });
    }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">

      {/* ── Section header ─────────────────────────────────── */}
      <div className="mb-6 text-center">
        {/* Main title — red color for the horror theme */}
        <h2 className="text-3xl font-bold text-red-500 tracking-widest uppercase font-serif">
          Last Words
        </h2>
        {/* Subtitle explaining the character limit */}
        <p className="text-gray-400 text-sm mt-1 italic">
          280 characters. Drop your scariest thought.
        </p>
        {/* Decorative divider */}
        <div className="mt-3 flex justify-center gap-2 text-red-500 text-xs tracking-widest">
          ─ 💀 ─ 💀 ─ 💀 ─
        </div>
      </div>

      {/* ── Compose box ────────────────────────────────────── */}
      {/* Card containing the textarea and submit button */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6 shadow-lg shadow-red-900/20">

        {/* Textarea for writing a new quote */}
        <textarea
          className="w-full bg-gray-900 text-gray-100 rounded-md p-3 resize-none
                     border border-gray-700 focus:outline-none focus:border-red-600
                     placeholder-gray-600 text-sm leading-relaxed"
          rows={3}
          maxLength={MAX_CHARS}
          placeholder="Drop your scariest thought, last words, or horror quote..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Allow Ctrl+Enter as a keyboard shortcut to submit
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />

        {/* Character counter row */}
        <div className="flex items-center justify-between mt-2">
          {/* Counter turns red when fewer than 30 chars remain */}
          <span
            className={`text-xs font-mono tabular-nums transition-colors ${
              charsLeft < 30
                ? 'text-red-500 font-bold'
                : 'text-gray-500'
            }`}
          >
            {charsLeft} / {MAX_CHARS}
          </span>

          {/* Submit button — red themed */}
          <button
            onClick={handleSubmit}
            disabled={submitting || draft.trim().length === 0}
            className="flex items-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-40
                       disabled:cursor-not-allowed text-white text-sm font-semibold
                       px-4 py-2 rounded-md transition-colors duration-200"
          >
            <span aria-hidden>💀</span>
            {/* Show loading state while posting */}
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Inline error message for the compose box */}
        {error && (
          <p className="mt-2 text-red-400 text-xs">{error}</p>
        )}
      </div>

      {/* ── Feed ───────────────────────────────────────────── */}

      {/* Loading skeleton — shows placeholder cards while data loads */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-lg p-4 animate-pulse"
            >
              {/* Avatar + username placeholder */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-700" />
                <div className="h-3 w-24 bg-gray-700 rounded" />
              </div>
              {/* Content placeholder */}
              <div className="space-y-2">
                <div className="h-3 bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-700 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state — shown when there are no quotes yet */}
      {!loading && words.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📝</p>
          <p className="italic text-sm">No quotes yet. Be the first to post.</p>
        </div>
      )}

      {/* Post cards — one card per quote */}
      {!loading && words.length > 0 && (
        <div className="space-y-4">
          {words.map((word) => {
            // Get the like state for this post, falling back to defaults
            const ls = likeStates[word.id] ?? { liked: false, likes: word.likes };
            // Apply fade-in animation only to posts added in this session
            const isNew = newIds.current.has(word.id);

            return (
              <article
                key={word.id}
                // Violet glow card + optional fade-in for newly posted entries
                className={`
                  bg-gray-800 border border-gray-700 rounded-lg p-4
                  shadow-md shadow-red-900/20
                  transition-shadow duration-300
                  hover:shadow-lg hover:shadow-red-800/30
                  hover:border-gray-600
                  ${isNew ? 'animate-fadeIn' : ''}
                `}
              >
                {/* ── Card header: avatar + username + time ── */}
                <div className="flex items-center gap-3 mb-3">
                  {/* Small circular avatar */}
                  <img
                    src={word.user.avatar}
                    alt={`${word.user.username}'s avatar`}
                    className="w-8 h-8 rounded-full object-cover border border-gray-600 flex-shrink-0"
                  />
                  <div className="flex items-baseline gap-2 min-w-0">
                    {/* Username */}
                    <span className="text-gray-200 text-sm font-semibold truncate">
                      {word.user.username}
                    </span>
                    {/* Relative timestamp */}
                    <span className="text-gray-600 text-xs flex-shrink-0">
                      {timeAgo(word.createdAt)}
                    </span>
                  </div>
                </div>

                {/* ── Post content displayed in italic serif font ── */}
                <p className="text-gray-200 italic text-sm leading-relaxed font-serif mb-4">
                  &ldquo;{word.content}&rdquo;
                </p>

                {/* ── Like button + count ───────────────────── */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLike(word.id)}
                    aria-label={ls.liked ? 'Unlike' : 'Like'}
                    // Toggle between red (liked) and gray (not liked) styles
                    className={`
                      flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
                      border transition-all duration-200
                      ${ls.liked
                        ? 'border-red-700 bg-red-900/40 text-red-400'
                        : 'border-gray-700 bg-gray-900/60 text-gray-500 hover:border-red-800 hover:text-red-500'
                      }
                    `}
                  >
                    {/* Heart icon — filled when liked, outline when not */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 flex-shrink-0"
                      // Filled when liked, outlined when not
                      fill={ls.liked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {/* Like count displayed next to the heart */}
                    <span className="tabular-nums">{ls.likes}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── CSS keyframe animation injected via a style tag ── */}
      {/* Tailwind's JIT doesn't know about this custom animation at build time,
          so we define it inline. Only a tiny style block — no extra dependencies. */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out both;
        }
      `}</style>
    </div>
  );
}
