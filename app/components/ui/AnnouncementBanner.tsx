'use client';
// AnnouncementBanner — shows a dismissable site-wide message at the top of every page.
// The banner is hidden after the user clicks X; dismissal is stored in sessionStorage
// so it reappears on a new browser session but not during the current visit.

import { useState, useEffect } from 'react';

export default function AnnouncementBanner({ message }: { message: string }) {
  // Start hidden to avoid a flash on pages where there's no banner
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    // Check if the user already dismissed this exact message in this session
    const dismissed = sessionStorage.getItem('announcement-dismissed');
    if (dismissed !== message) setVisible(true);
  }, [message]);

  if (!visible || !message) return null;

  const dismiss = () => {
    // Store the message text as the dismissal key so a new message shows again
    sessionStorage.setItem('announcement-dismissed', message);
    setVisible(false);
  };

  return (
    <div className="bg-red-700 text-white text-sm px-4 py-2.5 flex items-center justify-between gap-4">
      {/* Announcement text — centered in the available space */}
      <div className="flex-1 text-center font-medium">{message}</div>
      {/* Dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="flex-shrink-0 p-1 hover:bg-red-800 rounded transition"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
