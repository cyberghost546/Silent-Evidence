'use client';
// ============================================================
//  DMIcon.tsx
//
//  PURPOSE:
//    A header icon that links to /messages. It fetches the number
//    of unread direct messages from the server every 30 seconds and
//    shows a red badge on the icon when there is at least one unread
//    message. This gives the user a live, always-visible indicator
//    without requiring a full page reload.
//
//  WHERE IT IS USED:
//    Rendered inside Header.tsx in the logged-in user toolbar,
//    alongside NotificationBell and UserMenu.
//
//  KEY CONCEPTS:
//    - Polling with setInterval: we call the API on mount and then
//      repeat every 30 seconds. The interval is stored so we can
//      cancel it with clearInterval when the component unmounts,
//      preventing memory leaks.
//    - Conditional badge: the red bubble only mounts in the DOM when
//      count > 0, keeping the DOM clean for zero-message users.
//    - aria-label: the label changes dynamically ("3 unread messages"
//      vs "Messages") so screen-reader users hear the correct count.
// ============================================================

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DMIcon() {
  // count — the number of unread DMs for the logged-in user.
  // Starts at 0 (no badge visible) and updates after every poll.
  const [count, setCount] = useState(0);

  // ── Polling effect ───────────────────────────────────────────
  // Runs once on mount. The inner `load` function is async so we
  // can await the fetch without making the useEffect callback async
  // (React does not support async effect callbacks directly).
  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/messages/unread-count');
      if (res.ok) {
        const data = await res.json();
        // Nullish coalescing (??) falls back to 0 if data.count is
        // undefined or null (e.g. the API shape changes in future).
        setCount(data.count ?? 0);
      }
      // If the response is not OK (network error, 401, etc.)
      // we silently leave the previous count unchanged rather than
      // showing an error UI for a non-critical badge.
    };

    // Fetch immediately when the component first mounts
    load();

    // Then repeat every 30 seconds (30_000 ms).
    // The numeric literal uses an underscore separator for readability.
    const interval = setInterval(load, 30_000);

    // Cleanup: cancel the interval when the component unmounts.
    // Without this, the interval would keep running after the user
    // navigates away, causing state updates on an unmounted component.
    return () => clearInterval(interval);
  }, []); // Empty dependency array — only runs once on mount.

  return (
    // Link wraps the whole icon so the whole hit-target navigates to /messages.
    // aria-label is dynamic: screen readers will announce "3 unread messages"
    // or just "Messages" when the badge count is zero.
    <Link
      href="/messages"
      aria-label={count > 0 ? `${count} unread messages` : 'Messages'}
      className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-800 transition"
    >
      {/* Paper-plane / chat bubble SVG icon
          aria-hidden="true" is NOT set here because the Link's aria-label
          already provides a text alternative — the SVG is presentational.
          stroke="currentColor" means the icon inherits its colour from the
          parent element's text colour, making theming trivial. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 text-gray-400 hover:text-white transition"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {/* ── Unread badge ───────────────────────────────────────
          Only rendered when count > 0 — this avoids polluting the DOM
          with an invisible element on every page load.

          Positioning:
            absolute -top-0.5 -right-0.5 places the badge in the
            top-right corner of the icon, slightly overlapping the circle.

          Typography:
            min-w-[16px] ensures single-digit counts don't look squished.
            "99+" caps the displayed number so very large counts don't
            break the layout. */}
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
