/*
 * TagFollowButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose:
 *   A self-contained bell-icon button that lets a logged-in reader follow or
 *   unfollow a tag (e.g. "supernatural", "true-crime"). When clicked, the UI
 *   updates instantly (optimistic update) before the server confirms the change.
 *   If the server request fails, the UI is silently reverted to its previous
 *   state, ensuring the display always reflects the true server state.
 *
 * Usage:
 *   <TagFollowButton
 *     tagSlug="supernatural"
 *     tagName="Supernatural"
 *     initialFollowing={false}
 *     initialCount={342}
 *   />
 *
 * Props:
 *   tagSlug         – URL-safe slug used to construct the API endpoint.
 *   tagName         – Human-readable name shown in the aria-label for screen readers.
 *   initialFollowing – Whether the current user already follows this tag
 *                      (passed down from a server component or session check).
 *   initialCount     – Total follower count fetched server-side; rendered
 *                      separately from the button so it doesn't jump during updates.
 *
 * Optimistic UI pattern:
 *   1. Immediately flip `following` and adjust `count` locally.
 *   2. Fire the POST /api/tags/:slug/follow request.
 *   3. If the request fails (network error or non-2xx), roll back both pieces
 *      of state to what they were before the click.
 *   4. If the request succeeds, the optimistic values were correct — no update needed.
 *
 * Accessibility:
 *   aria-label changes dynamically ("Follow tag X" / "Unfollow tag X") so screen
 *   readers announce the correct action without any extra hidden text.
 *   `disabled={loading}` prevents keyboard-triggered double-submits.
 *   `suppressHydrationWarning` avoids a React hydration mismatch because the
 *   `initialFollowing` prop may differ between server render and first client render
 *   (the server doesn't know the session until auth is resolved client-side).
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use client'; // Marks this as a Client Component — it uses useState and fetch

import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

// ── Props interface ────────────────────────────────────────────────────────────

type Props = {
  tagSlug: string; // URL slug of the tag (e.g. "supernatural")
  tagName: string; // Human-readable tag name shown in aria-label
  initialFollowing: boolean; // Whether the current user already follows this tag
  initialCount: number; // Total follower count fetched server-side
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TagFollowButton({
  tagSlug,
  tagName,
  initialFollowing,
  initialCount,
}: Props) {
  // `following` — local shadow of the server-side follow state.
  // Seeded from `initialFollowing` so the button renders correctly on first paint.
  const [following, setFollowing] = useState(initialFollowing);

  // `count` — optimistically incremented/decremented each time the user clicks.
  // Seeded from `initialCount` which was fetched on the server.
  const [count, setCount] = useState(initialCount);

  // `loading` — true while the API request is in-flight.
  // Used to disable the button and prevent double-clicks.
  const [loading, setLoading] = useState(false);

  // ── Event handler ──────────────────────────────────────────────────────────

  async function handleToggle() {
    // Guard: ignore rapid re-clicks while a request is already pending.
    if (loading) return;
    setLoading(true);

    // Save the current state so we can revert if the request fails.
    const wasFollowing = following;

    // ── Step 1: Optimistic update ──────────────────────────────────────────
    // Flip the follow flag immediately so the UI feels instant (no wait for API).
    setFollowing(!wasFollowing);
    // Increment if following, decrement if unfollowing.
    setCount((prev) => (wasFollowing ? prev - 1 : prev + 1));

    try {
      // ── Step 2: Persist to server ──────────────────────────────────────
      // POST to the follow/unfollow API endpoint.
      // `credentials: 'include'` ensures the session cookie is sent so the
      // server knows which user is making the request.
      const res = await fetch(`/api/tags/${tagSlug}/follow`, {
        method: 'POST',
        credentials: 'include', // send session cookie
      });

      if (!res.ok) {
        // ── Step 3a: Server rejected the request — revert optimistic update ──
        setFollowing(wasFollowing);
        setCount((prev) => (wasFollowing ? prev + 1 : prev - 1));
      }
      // On 2xx success, our optimistic values already match the server — no action needed.
    } catch {
      // ── Step 3b: Network error — also revert ──────────────────────────
      setFollowing(wasFollowing);
      setCount((prev) => (wasFollowing ? prev + 1 : prev - 1));
    } finally {
      // Always re-enable the button once the request settles (success or failure).
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    // Flex row: [button] [count] — keeps the count from jumping inside the button
    <div className="flex items-center gap-2">
      {/* ── Toggle button ──────────────────────────────────────────────────────
          Visual design:
            following  → solid red background ("I am following this")
            !following → ghost / outlined ("click to follow")
          Loading    → reduced opacity + not-allowed cursor to signal pending state.

          The dynamic aria-label ensures screen readers always announce the
          *outcome* of clicking ("Follow tag X" means "clicking will follow it").
      */}
      <button
        onClick={handleToggle}
        disabled={loading}
        suppressHydrationWarning // prevents hydration mismatch from SSR→client delta
        aria-label={following ? `Unfollow tag ${tagName}` : `Follow tag ${tagName}`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
          following
            ? // Currently following — filled red button
              'bg-red-600 border-red-600 text-white hover:bg-red-700'
            : // Not following — ghost button with hover highlight
              'bg-transparent border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400'
        } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {/* Bell icon changes state to show follow status:
            muted bell   = "you ARE following, click to mute/unfollow"
            ringing bell = "you are NOT following, click to follow" */}
        {following ? (
          <BellOff className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Bell className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        )}

        {/* Text label reflects current state, not the action */}
        <span>{following ? 'Following' : 'Follow'}</span>
      </button>

      {/* ── Follower count ──────────────────────────────────────────────────────
          Rendered outside the button so width changes don't cause the button
          to grow/shrink as the count updates.
          tabular-nums keeps digits aligned (prevents text shifting as count changes).
          Counts ≥ 1000 are shortened to "X.Xk" format to save space.
          Not shown if count is 0 (no value in showing "0 followers").
      */}
      {count > 0 && (
        <span className="text-xs text-gray-500 tabular-nums">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </div>
  );
}
