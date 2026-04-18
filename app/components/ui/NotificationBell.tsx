// app/components/ui/NotificationBell.tsx
// The bell icon in the header that shows how many unread notifications a user has.
// Clicking it opens a dropdown list of recent notifications.
// Also shows temporary "toast" popups in the bottom-right corner when new
// notifications arrive (polled every 60 seconds in the background).
// This is a client component — it needs browser APIs and interactivity.

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// Shape of a single notification from the /api/notifications endpoint
type Notification = {
  id: number;
  type: string;       // 'LIKE', 'REPLY', 'FOLLOW', 'COMMENT', etc.
  message: string;    // Human-readable text, e.g. "Chris liked your story"
  read: boolean;
  createdAt: string;
  story: { slug: string; title: string } | null; // The story this relates to (if any)
};

// Shape of a toast popup — a simplified subset of Notification
type Toast = { id: number; message: string; icon: string; href: string };

// iconFor — maps a notification type to an emoji icon displayed in the UI
function iconFor(type: string) {
  if (type === 'LIKE')   return '♥';
  if (type === 'REPLY')  return '↩';
  if (type === 'FOLLOW') return '👤';
  return '💬'; // Default for COMMENT and anything else
}

export default function NotificationBell() {
  // Controls whether the dropdown panel is visible
  const [open, setOpen]                   = useState(false);
  // Full list of notifications shown in the dropdown
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Count of unread notifications — shown as the red badge on the bell
  const [unread, setUnread]               = useState(0);
  // Active toast popups shown in the bottom-right corner
  const [toasts, setToasts]               = useState<Toast[]>([]);
  // Ref attached to the wrapper div — used to detect clicks outside the dropdown
  const ref                               = useRef<HTMLDivElement>(null);
  // Track the highest notification ID we've already toasted to avoid re-showing
  const lastSeenId                        = useRef<number | null>(null);

  // dismissToast — removes one toast from the stack by its ID
  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // load — fetches the latest notifications from the API and updates state.
  // Wrapped in useCallback so it doesn't get recreated on every render
  // (important because it's used in a setInterval below).
  const load = useCallback(async () => {
    const res = await fetch('/api/notifications');
    if (!res.ok) return;
    const data = await res.json();

    setNotifications(data.notifications);
    setUnread(data.unread);

    // Find unread notifications we haven't shown as a toast yet.
    // We compare against lastSeenId so we don't re-toast old notifications on every poll.
    const newOnes: Notification[] = data.notifications.filter(
      (n: Notification) =>
        !n.read && (lastSeenId.current === null || n.id > lastSeenId.current)
    );

    if (newOnes.length > 0) {
      // Update the watermark so these won't be toasted again next poll
      lastSeenId.current = Math.max(...newOnes.map((n) => n.id));

      // Only show up to 3 toasts at a time to avoid flooding the screen
      const next: Toast[] = newOnes.slice(0, 3).map((n) => ({
        id: n.id,
        message: n.message,
        icon: iconFor(n.type),
        href: n.story ? `/story/${n.story.slug}` : '#',
      }));

      setToasts((prev) => [...prev, ...next]);

      // Auto-dismiss each toast after 5 seconds
      next.forEach((t) => setTimeout(() => dismissToast(t.id), 5000));
    }
  }, []);

  // On mount: load immediately, then poll every 60 seconds for new notifications.
  // The cleanup function clears the interval when the component unmounts.
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Close the dropdown when the user clicks anywhere outside it
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // markRead — calls the API to mark all notifications as read, then updates local state
  const markRead = async () => {
    if (unread === 0) return;
    await fetch('/api/notifications', { method: 'PATCH' });
    setUnread(0);
    // Update each notification in local state so the unread dot disappears immediately
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // toggle — opens/closes the dropdown and marks notifications read when opening
  const toggle = () => {
    setOpen((o) => !o);
    // Mark as read when the dropdown is opened (not when closed)
    if (!open) markRead();
  };

  return (
    <>
      {/* Bell button + dropdown — wrapped in a relative div so the dropdown positions correctly */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={toggle}
          className="relative p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-gray-800"
          aria-label="Notifications"
        >
          {/* Bell SVG icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
          </svg>
          {/* Red badge — only shown when there are unread notifications; caps at "9+" */}
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Dropdown panel — only rendered when open */}
        {open && (
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-16px)] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <button type="button" onClick={markRead} className="text-xs text-gray-500 hover:text-red-400 transition">Mark all read</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  // Each notification is a clickable link to the related story (if any)
                  <a
                    key={n.id}
                    href={n.story ? `/story/${n.story.slug}` : '#'}
                    // Slightly lighter background for unread items so they stand out
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition border-b border-gray-800/50 ${!n.read ? 'bg-gray-800/40' : ''}`}
                  >
                    <span className="text-base mt-0.5">{iconFor(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 leading-snug">{n.message}</p>
                      {n.story && <p className="text-xs text-gray-600 truncate mt-0.5">{n.story.title}</p>}
                      <p className="text-xs text-gray-600 mt-1">{new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                    {/* Small red dot on the right for unread notifications */}
                    {!n.read && <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />}
                  </a>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast stack — slides in from bottom-right when new notifications arrive.
          pointer-events-none on the container lets clicks pass through the gap between toasts. */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
          {toasts.map((t) => (
            // pointer-events-auto re-enables clicks on the toast itself
            <a
              key={t.id}
              href={t.href}
              className="pointer-events-auto flex items-start gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl w-80 animate-slide-in hover:border-red-600/50 transition-colors"
              onClick={() => dismissToast(t.id)}
            >
              <span className="text-lg mt-0.5 flex-shrink-0">{t.icon}</span>
              <p className="text-sm text-gray-200 flex-1 leading-snug">{t.message}</p>
              {/* X button — stops propagation so clicking X doesn't also follow the link */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); dismissToast(t.id); }}
                className="text-gray-600 hover:text-white transition flex-shrink-0 text-base leading-none"
              >
                ✕
              </button>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
