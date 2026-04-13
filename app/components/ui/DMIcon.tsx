'use client';
// DMIcon.tsx
// Header icon that links to /messages with a red badge showing total unread DMs.
// Polls every 30 seconds so the count stays fresh without a page reload.

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DMIcon() {
  const [count, setCount] = useState(0);

  // Fetch unread count on mount and every 30 seconds after
  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/messages/unread-count');
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/messages"
      aria-label={count > 0 ? `${count} unread messages` : 'Messages'}
      className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-800 transition"
    >
      {/* Paper-plane / chat icon */}
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

      {/* Red unread badge — hidden when count is 0 */}
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
