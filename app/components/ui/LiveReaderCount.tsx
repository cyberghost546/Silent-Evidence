'use client';
// =============================================================================
// LiveReaderCount.tsx  —  CLIENT COMPONENT
// =============================================================================
// Purpose:
//   Displays a "X reading now" indicator on a story page, giving readers a sense
//   of how many people are currently reading the same story — a social-proof
//   effect that can increase engagement and dwell time.
//
// Usage:
//   <LiveReaderCount storyId={story.id} />
//   Place anywhere on the story page. The component is self-contained: it
//   manages its own heartbeat and polling without external props beyond storyId.
//
// How it works:
//   1. On mount, a "presence heartbeat" is sent via POST every 30 seconds.
//      The server records this session as "active" with a short TTL
//      (e.g. 60 seconds) so sessions disappear automatically when a user leaves.
//   2. Simultaneously, a GET request polls the count every 30 seconds and
//      updates the displayed number.
//   3. Both intervals are cleared on unmount to prevent memory leaks.
//
// Session identity:
//   A stable anonymous session ID is stored in localStorage under 'se_session_id'.
//   This lets the server deduplicate multiple tabs open to the same story without
//   requiring the user to be logged in.
//
// API surface:
//   POST /api/stories/presence   body: { storyId, sessionId }  → 200 OK
//   GET  /api/stories/presence?storyId=N                       → { count: number }
// =============================================================================

import { useEffect, useRef, useState } from 'react';

// ── getSessionId: retrieve or create a stable anonymous session identifier ────
// Stored in localStorage so it persists across page navigations in the same browser.
// Format: "<unix-ms>-<random-base36>" — effectively unique without a UUID library.
// The guard `typeof window === 'undefined'` prevents this from running during
// SSR (Next.js pre-renders the component on the server where localStorage doesn't exist).
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('se_session_id');
  if (!id) {
    // Generate a new ID: current timestamp + random suffix for uniqueness.
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('se_session_id', id);
  }
  return id;
}

export default function LiveReaderCount({ storyId }: { storyId: number }) {

  // ── State ─────────────────────────────────────────────────────────────────

  // The current reader count. Starts as null (not yet fetched) so we can
  // avoid rendering a "0 reading now" flash before the first API response.
  const [count, setCount] = useState<number | null>(null);

  // Stable ref for the session ID — useRef so reading it inside the effect
  // closure doesn't cause stale value issues across re-renders, and because
  // the session ID itself never changes (no need to trigger re-renders).
  const sessionId = useRef<string>('');

  // ── Side effect: heartbeat + count polling ───────────────────────────────
  useEffect(() => {
    // Resolve the session ID on the client (after SSR, where localStorage is available).
    sessionId.current = getSessionId();

    // ── sendHeartbeat ──────────────────────────────────────────────────────
    // Tells the server "this session is still reading story X". The server sets
    // a short TTL (e.g. 60 seconds) on the record, so sessions automatically
    // expire when the user closes the tab or navigates away — no explicit
    // "leave" signal needed.
    // .catch(() => {}) — swallow errors silently; a missed heartbeat just means
    // this session might drop from the count 30–60 seconds early.
    const sendHeartbeat = () => {
      fetch('/api/stories/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, sessionId: sessionId.current }),
      }).catch(() => {});
    };

    // ── fetchCount ────────────────────────────────────────────────────────
    // Fetches the current count of active sessions reading this story and
    // updates the displayed number.
    // .catch(() => {}) — if this fails, keep showing the last known count.
    const fetchCount = () => {
      fetch(`/api/stories/presence?storyId=${storyId}`)
        .then(r => r.json())
        .then(d => setCount(d.count))
        .catch(() => {});
    };

    // Run both immediately on mount so there's no 30-second delay before
    // the heartbeat is sent or the count is shown.
    sendHeartbeat();
    fetchCount();

    // Then repeat every 30 seconds.
    // 30 seconds balances freshness against request volume. With 1000 concurrent
    // readers, this generates ~33 requests/second — manageable for a simple API.
    const heartbeatInterval = setInterval(sendHeartbeat, 30_000);
    const pollInterval      = setInterval(fetchCount,     30_000);

    // Cleanup: clear both intervals when the component unmounts (user navigates
    // away from the story page). Without this, the intervals would keep firing
    // in the background and attempt to update state on an unmounted component.
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(pollInterval);
    };
  }, [storyId]);
  // [storyId] as the dependency: if storyId ever changes (unlikely but possible
  // in a SPA with route changes), the intervals restart for the new story.

  // ── Early return: don't render until we have data ─────────────────────────
  // Avoids showing "0 reading now" during the very first fetch.
  // Once count is a number (even 0), we render the badge.
  if (count === null) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // inline-flex keeps this from taking up a full block line — it sits inline
    // with surrounding metadata text (author, date, etc.)
    <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">

      {/* ── Pulsing green "live" dot ──────────────────────────────────────── */}
      {/*
        Two layered spans create the pulsing halo effect:
          Outer span (animate-ping): expands and fades repeatedly — this is the
            "ping" that radiates outward from the dot centre.
          Inner span: the solid green dot — stays at a fixed size and acts as the
            visual anchor that the ping emanates from.
        relative/absolute positioning keeps both spans exactly on top of each other.
      */}
      <span className="relative flex h-2 w-2">
        {/* Animated ping ring — fades and expands continuously */}
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        {/* Solid dot — always fully visible */}
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>

      {/* Reader count label */}
      {count} reading now
    </span>
  );
}
