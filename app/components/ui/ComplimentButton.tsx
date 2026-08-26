'use client';
// app/components/ui/ComplimentButton.tsx
// One-click compliment button shown on author profiles.
// Opens a small dropdown with 5 preset messages; selecting one sends it as a DM.
// Shows a toast-style feedback message after sending.

import { useState, useRef, useEffect } from 'react';

type Props = {
  toUserId: number; // ID of the author receiving the compliment
  toUsername: string; // Username shown in the dropdown header
  fromUserId: number | null; // Null when the viewer is not logged in
};

// The 5 preset compliment options shown in the dropdown
const COMPLIMENTS = [
  'Your writing genuinely scared me — great work!',
  "I couldn't stop reading. Incredible story!",
  'The atmosphere you created was perfect',
  'This gave me chills. Please write more!',
  'You have a real talent for horror writing. Keep going',
] as const;

export default function ComplimentButton({ toUserId, toUsername, fromUserId }: Props) {
  // Whether the dropdown is open
  const [open, setOpen] = useState(false);
  // Tracks in-flight requests to disable options while sending
  const [sending, setSending] = useState(false);
  // Feedback message shown after sending ("Sent! 💌" or an error)
  const [feedback, setFeedback] = useState<string | null>(null);

  // Ref to detect clicks outside the dropdown so we can close it
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when the user clicks anywhere outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Hide the feedback toast after 3 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function sendCompliment(text: string) {
    if (sending) return;

    // Prompt login if the user is not authenticated
    if (!fromUserId) {
      setOpen(false);
      setFeedback('Log in to send a compliment.');
      return;
    }

    setSending(true);
    setOpen(false); // close dropdown immediately for a clean UX

    try {
      const res = await fetch('/api/compliments', {
        method: 'POST',
        credentials: 'include', // send session cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId, text }),
      });

      if (res.ok) {
        setFeedback('Sent!');
      } else {
        const data = await res.json().catch(() => ({}));
        // Show the server-returned error message or a generic fallback
        setFeedback(data.error ?? 'Could not send compliment.');
      }
    } catch {
      setFeedback('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Main trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={sending}
        suppressHydrationWarning
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-600 text-gray-300 hover:border-pink-500 hover:text-pink-400 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>Send Compliment</span>
      </button>

      {/* Dropdown with preset messages */}
      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 left-0 w-72 rounded-xl border border-gray-700 bg-gray-900 shadow-xl overflow-hidden"
        >
          {/* Dropdown header */}
          <div className="px-4 py-2.5 border-b border-gray-800 text-xs text-gray-500 font-medium">
            Compliment @{toUsername}
          </div>

          {/* List of preset compliment options */}
          <ul className="py-1">
            {COMPLIMENTS.map((text) => (
              <li key={text}>
                <button
                  role="option"
                  onClick={() => sendCompliment(text)}
                  disabled={sending}
                  suppressHydrationWarning
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-150 disabled:opacity-60"
                >
                  {text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback toast — appears below the button after sending */}
      {feedback && (
        <div
          className={`absolute left-0 top-full mt-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-40 ${
            feedback.startsWith('Sent')
              ? 'bg-green-900/80 text-green-300 border border-green-700'
              : 'bg-red-900/80 text-red-300 border border-red-700'
          }`}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
