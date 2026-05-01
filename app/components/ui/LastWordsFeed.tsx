'use client';
// =============================================================================
// LastWordsFeed.tsx
// =============================================================================
// Purpose:
//   A quote micro-post feed where users share their favourite horror quotes
//   (capped at 280 characters — a deliberate Twitter-style constraint).
//   The feed loads on mount, supports optimistic "like" toggling, and prepends
//   newly posted quotes with a CSS fade-in animation.
//
// Usage:
//   <LastWordsFeed userId={userId} />
//   Pass the currently logged-in user's DB id, or null for guests.
//   Guests can read and see the feed but cannot post or like.
//
// API surface:
//   GET  /api/last-words              → returns LastWord[]
//   POST /api/last-words              → creates a new quote, returns LastWord
//   POST /api/last-words/[id]/like    → toggles like, returns { liked, likes }
//
// Architecture notes:
//   - 'use client' is required because this component uses useState, useEffect,
//     useRef, and event handlers — none of which work in Server Components.
//   - Optimistic UI: likes update instantly in local state; the server response
//     then reconciles the true value. On network failure the state is rolled back.
//   - The custom @keyframes animation is injected via an inline <style> tag
//     because Tailwind's JIT cannot generate arbitrary keyframe names at build time.
//   - newIds is a useRef (not useState) because it doesn't need to trigger
//     re-renders — it only needs to be readable during render to apply the class.
// =============================================================================

import { useState, useEffect, useRef } from 'react';

// ── Type definitions ──────────────────────────────────────────────────────────

// Shape of a single post as returned by GET /api/last-words.
// Matches the Prisma query that includes the user relation.
type LastWord = {
  id: number;
  content: string;
  createdAt: string;        // ISO 8601 string — serialised from a Date by Prisma
  likes: number;
  user: {
    username: string;
    avatar: string;         // ui-avatars URL or a user-uploaded profile image URL
  };
};

// Tracks per-post like state locally so hearts update instantly without waiting
// for a full server re-fetch of the whole list (optimistic UI pattern).
type LikeState = {
  liked: boolean;   // has the current user liked this post in this browser session?
  likes: number;    // current total like count (authoritative after server sync)
};

// Props accepted by this component
type Props = {
  userId: number | null;  // null = unauthenticated guest visitor
};

// ── Helper: human-readable relative timestamp ─────────────────────────────────
// Converts an ISO timestamp to a natural English phrase like "2 hours ago".
// Falls back to a full locale date string for posts older than 30 days.
// This function is called both on mount and whenever new posts appear.
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime(); // milliseconds since post
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  // For very old posts, a locale-formatted date is clearer than "47 days ago"
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
// Named LastWordsFeed (not QuoteFeed) to keep existing API routes and page
// imports working without a find-and-replace refactor.
export default function LastWordsFeed({ userId }: Props) {

  // ── State ─────────────────────────────────────────────────────────────────

  // The ordered list of posts fetched from the API (newest first after prepend).
  const [words, setWords] = useState<LastWord[]>([]);

  // Per-post like state keyed by post id.
  // Using a Record<number, LikeState> instead of storing liked/likes inside
  // each LastWord object avoids mutating the immutable server data shape.
  const [likeStates, setLikeStates] = useState<Record<number, LikeState>>({});

  // Controlled value for the compose textarea.
  const [draft, setDraft] = useState('');

  // Loading flag for the initial data fetch (shows skeleton cards).
  const [loading, setLoading] = useState(true);

  // True while the POST /api/last-words request is in-flight.
  // Disables the submit button and shows "Posting..." label.
  const [submitting, setSubmitting] = useState(false);

  // Inline error message shown below the compose box or above the feed.
  const [error, setError] = useState('');

  // Set of post ids that were created in THIS browser session.
  // useRef (not useState) because changing it must NOT trigger a re-render —
  // it's only read during render to conditionally apply the animate-fadeIn class.
  const newIds = useRef<Set<number>>(new Set());

  // Maximum character limit — matches the Twitter-style UX constraint.
  const MAX_CHARS = 280;
  // Derive remaining characters from the draft length on every render.
  const charsLeft = MAX_CHARS - draft.length;

  // ── Side effect: fetch posts on mount ─────────────────────────────────────
  // The empty dependency array [] means this runs exactly once after the
  // component first mounts. No polling — the feed is static until the user
  // posts or refreshes.
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/last-words');
        if (!res.ok) throw new Error('Fetch failed');
        const data: LastWord[] = await res.json();
        setWords(data);

        // Initialise the likeStates record for every fetched post.
        // We don't know server-side which ones the current user has liked
        // (that would require a per-user query), so start with liked: false.
        // The user can toggle from there; their real state is persisted server-side.
        const initial: Record<number, LikeState> = {};
        for (const w of data) {
          initial[w.id] = { liked: false, likes: w.likes };
        }
        setLikeStates(initial);
      } catch {
        // Show a friendly error rather than a blank feed on network failure.
        setError('Could not load the feed. Please refresh.');
      } finally {
        // Always clear the loading flag so the skeleton disappears.
        setLoading(false);
      }
    }
    load();
  }, []); // empty deps → run once on mount only

  // ── Event handler: submit a new quote ─────────────────────────────────────
  // Validates the draft, POSTs to the API, prepends the new post to the feed,
  // and initialises its like state — all without a full page refresh.
  async function handleSubmit() {
    // Guard: authentication required — guests see an inline error.
    if (!userId) {
      setError('You must be logged in to post quotes.');
      return;
    }
    const trimmed = draft.trim();
    // Guard: reject empty submissions (the button is also disabled, but
    // keyboard shortcut Ctrl+Enter can still call this handler).
    if (!trimmed) {
      setError('Write something first...');
      return;
    }
    // Guard: enforce the 280-character limit on the client before hitting the API.
    if (trimmed.length > MAX_CHARS) {
      setError(`Keep it to ${MAX_CHARS} characters or fewer.`);
      return;
    }

    setError('');       // clear previous errors
    setSubmitting(true); // disable the button + show "Posting..."

    try {
      const res = await fetch('/api/last-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The API expects { content, userId } in the JSON body.
        body: JSON.stringify({ content: trimmed, userId }),
      });

      if (!res.ok) {
        // Try to surface the API's own error message (e.g. "Duplicate post").
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to post. Try again!');
      }

      const newWord: LastWord = await res.json();

      // Mark this post id so the card gets the CSS fade-in animation.
      // Using a ref Set means we never re-render just to track this membership.
      newIds.current.add(newWord.id);

      // Prepend the new post so it appears at the top of the feed immediately.
      // Using the functional update form ensures we work from the latest state
      // even if multiple fast submissions happen.
      setWords((prev) => [newWord, ...prev]);

      // Initialise like state for the new post (starts at 0 likes, not liked).
      setLikeStates((prev) => ({
        ...prev,
        [newWord.id]: { liked: false, likes: 0 },
      }));

      // Clear the textarea so the user can compose a fresh post.
      setDraft('');
    } catch (err: unknown) {
      // Display the thrown error message or a generic fallback.
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again!');
    } finally {
      // Always re-enable the button, even on failure.
      setSubmitting(false);
    }
  }

  // ── Event handler: toggle like on a post ──────────────────────────────────
  // Implements the "optimistic UI" pattern:
  //   1. Flip the local like state immediately so the heart responds at once.
  //   2. Send the toggle to the server.
  //   3. Sync with the authoritative server response.
  //   4. On failure, roll back the local state to what it was before.
  async function handleLike(wordId: number) {
    // Guard: authentication required.
    if (!userId) {
      setError('Log in to like quotes.');
      return;
    }

    // Step 1 — Optimistic update: flip liked + adjust count immediately.
    setLikeStates((prev) => {
      const cur = prev[wordId] ?? { liked: false, likes: 0 };
      return {
        ...prev,
        [wordId]: {
          liked: !cur.liked,
          // Increment if was not liked, decrement if was liked.
          likes: cur.liked ? cur.likes - 1 : cur.likes + 1,
        },
      };
    });

    try {
      // Step 2 — Tell the server about the toggle.
      const res = await fetch(`/api/last-words/${wordId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error('Like failed');

      // Step 3 — Replace optimistic values with server-authoritative values.
      // This handles edge cases (e.g. race conditions, duplicate requests).
      const { liked, likes }: { liked: boolean; likes: number } = await res.json();
      setLikeStates((prev) => ({ ...prev, [wordId]: { liked, likes } }));
    } catch {
      // Step 4 — Roll back: undo the optimistic update so the UI is consistent
      // with what the server actually stored.
      setLikeStates((prev) => {
        const cur = prev[wordId] ?? { liked: false, likes: 0 };
        return {
          ...prev,
          [wordId]: {
            liked: !cur.liked,                              // flip back
            likes: cur.liked ? cur.likes + 1 : cur.likes - 1, // undo count change
          },
        };
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // max-w-2xl mx-auto — centers the feed and limits its width for readability.
    // px-4 py-6 — padding so content doesn't touch the viewport edges on mobile.
    <div className="w-full max-w-2xl mx-auto px-4 py-6">

      {/* ── Section header ──────────────────────────────────────────────────── */}
      <div className="mb-6 text-center">
        {/* Green serif heading — matches the horror blog's typographic palette */}
        <h2 className="text-3xl font-bold text-green-500 tracking-widest uppercase font-serif">
          Last Words
        </h2>
        {/* Subtitle sets the character-limit expectation upfront */}
        <p className="text-gray-400 text-sm mt-1 italic">
          280 characters. Drop your best quote.
        </p>
        {/* Decorative sparkle divider — purely aesthetic, no semantic role */}
        <div className="mt-3 flex justify-center gap-2 text-green-500 text-xs tracking-widest">
          ─ ✦ ─ ✦ ─ ✦ ─
        </div>
      </div>

      {/* ── Compose box ─────────────────────────────────────────────────────── */}
      {/*
        Card wrapper: dark background, border, rounded corners, and a subtle
        green glow shadow to keep the compose area visually distinct from feed cards.
      */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6 shadow-lg shadow-green-900/20" suppressHydrationWarning>

        {/* Controlled textarea — every keystroke updates `draft` state via onChange.
            maxLength is a browser-enforced hard cap; the charsLeft counter
            provides the visual feedback before the user hits that limit.
            Ctrl+Enter (or Cmd+Enter on Mac) submits as a keyboard shortcut. */}
        <textarea
          className="w-full bg-gray-900 text-gray-100 rounded-md p-3 resize-none
                     border border-gray-700 focus:outline-none focus:border-green-600
                     placeholder-gray-600 text-sm leading-relaxed"
          rows={3}
          maxLength={MAX_CHARS}
          placeholder="Drop your favorite horror quote..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Suppress the React hydration warning that would appear because the
          // server renders an empty textarea while the client may restore a
          // draft from browser state (e.g. after a back-navigation).
          suppressHydrationWarning
          onKeyDown={(e) => {
            // Allow power users to submit without reaching for the mouse.
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />

        {/* Character counter + submit button row */}
        <div className="flex items-center justify-between mt-2">

          {/* Remaining character counter.
              tabular-nums — forces all digits to the same width so the number
                doesn't cause layout shift as it decreases.
              Colour changes from muted gray to bold green when fewer than 30
              chars remain, acting as a soft warning to the user. */}
          <span
            className={`text-xs font-mono tabular-nums transition-colors ${
              charsLeft < 30
                ? 'text-green-500 font-bold'
                : 'text-gray-500'
            }`}
          >
            {charsLeft} / {MAX_CHARS}
          </span>

          {/* Submit button.
              disabled when submitting (request in-flight) OR when the draft is
              empty after trimming — prevents accidental blank posts. */}
          <button
            onClick={handleSubmit}
            disabled={submitting || draft.trim().length === 0}
            suppressHydrationWarning
            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40
                       disabled:cursor-not-allowed text-white text-sm font-semibold
                       px-4 py-2 rounded-md transition-colors duration-200"
          >
            {/* Purely decorative sparkle — aria-hidden so screen readers skip it */}
            <span aria-hidden>✨</span>
            {/* Label switches to "Posting..." while the network request is in-flight */}
            {submitting ? 'Posting...' : 'Post Quote'}
          </button>
        </div>

        {/* Inline error message — only mounted when error state is non-empty.
            Text is green-400 to stay on-brand while still reading as an alert. */}
        {error && (
          <p className="mt-2 text-green-400 text-xs">{error}</p>
        )}
      </div>

      {/* ── Feed area ───────────────────────────────────────────────────────── */}

      {/* Loading skeleton ── shown while the initial fetch is in-flight.
          Four placeholder cards with animate-pulse mimic the real card layout
          so the page doesn't feel empty or broken during loading. */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-lg p-4 animate-pulse"
            >
              {/* Avatar + username skeleton */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-700" />
                <div className="h-3 w-24 bg-gray-700 rounded" />
              </div>
              {/* Content skeleton — two lines of different widths */}
              <div className="space-y-2">
                <div className="h-3 bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-700 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state ── shown after loading completes with zero posts.
          Encourages the first user to break the ice. */}
      {!loading && words.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📝</p>
          <p className="italic text-sm">No quotes yet. Be the first to post.</p>
        </div>
      )}

      {/* Quote post cards ── one <article> per quote, newest first. */}
      {!loading && words.length > 0 && (
        // space-y-4 — 16px vertical gap between cards without needing margins on children.
        <div className="space-y-4">
          {words.map((word) => {
            // Get the like state for this post, falling back to defaults
            // in case the post was newly added and likeStates hasn't been
            // updated yet (defensive programming).
            const ls = likeStates[word.id] ?? { liked: false, likes: word.likes };

            // True only for posts created in this browser session — used to
            // apply the CSS fade-in slide-down animation class.
            const isNew = newIds.current.has(word.id);

            return (
              // <article> is the semantically correct element for a self-contained
              // piece of content like a social post or news item.
              <article
                key={word.id}
                className={`
                  bg-gray-800 border border-gray-700 rounded-lg p-4
                  shadow-md shadow-green-900/20
                  transition-shadow duration-300
                  hover:shadow-lg hover:shadow-green-800/30
                  hover:border-gray-600
                  ${isNew ? 'animate-fadeIn' : ''}
                `}
              >
                {/* ── Card header: avatar + username + timestamp ─────────── */}
                <div className="flex items-center gap-3 mb-3">

                  {/* Circular avatar image.
                      flex-shrink-0 prevents the avatar from being squashed
                      when the username is long. */}
                  <img
                    src={word.user.avatar}
                    alt={`${word.user.username}'s avatar`}
                    className="w-8 h-8 rounded-full object-cover border border-gray-600 flex-shrink-0"
                  />

                  <div className="flex items-baseline gap-2 min-w-0">
                    {/* Username — truncate with ellipsis if it's very long */}
                    <span className="text-gray-200 text-sm font-semibold truncate">
                      {word.user.username}
                    </span>
                    {/* Relative timestamp — flex-shrink-0 keeps it from wrapping */}
                    <span className="text-gray-600 text-xs flex-shrink-0">
                      {timeAgo(word.createdAt)}
                    </span>
                  </div>
                </div>

                {/* ── Quote content ──────────────────────────────────────── */}
                {/* Wrapped in typographic curly quotes (HTML entities &ldquo; &rdquo;)
                    for a polished look. font-serif + italic evoke the feel of a
                    printed quote. */}
                <p className="text-gray-200 italic text-sm leading-relaxed font-serif mb-4">
                  &ldquo;{word.content}&rdquo;
                </p>

                {/* ── Like button + count ───────────────────────────────── */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLike(word.id)}
                    // Accessible label changes based on current like state
                    aria-label={ls.liked ? 'Unlike' : 'Like'}
                    className={`
                      flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
                      border transition-all duration-200
                      ${ls.liked
                        // Liked state: solid green background + border
                        ? 'border-green-700 bg-green-900/40 text-green-400'
                        // Not liked: outlined gray, green on hover
                        : 'border-gray-700 bg-gray-900/60 text-gray-500 hover:border-green-800 hover:text-green-500'
                      }
                    `}
                  >
                    {/* Heart SVG icon.
                        fill switches between "currentColor" (filled heart when liked)
                        and "none" (outline heart when not liked). */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 flex-shrink-0"
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
                    {/* tabular-nums ensures the count doesn't cause layout shift
                        when switching between 1-digit and 2-digit numbers. */}
                    <span className="tabular-nums">{ls.likes}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Custom CSS animation via inline <style> tag ─────────────────────── */}
      {/*
        Why inject a <style> tag instead of using Tailwind config?
          Tailwind's JIT mode only generates classes it finds in source files at
          build time. A custom @keyframes animation with a unique name like
          "fadeIn" must be defined somewhere Tailwind can see it (tailwind.config)
          OR injected at runtime like this. The inline approach avoids touching
          the shared config and keeps the animation self-contained in this file.

        The animation slides a new card in from 12px above its resting position
        while fading it from transparent to fully opaque over 0.4 seconds,
        giving a smooth "it just appeared" effect.
      */}
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
        /* Applied only to cards added in the current session (see newIds ref) */
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out both;
        }
      `}</style>
    </div>
  );
}
