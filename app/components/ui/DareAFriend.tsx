'use client';
// ============================================================
//  DareAFriend.tsx
//  A button on a story page that lets the logged-in user dare
//  a friend (by username) to read this scary story, with an
//  optional personal message.
// ============================================================

import { useState } from 'react';

// ── Props ─────────────────────────────────────────────────────
type Props = {
  storyId: number;       // The story being dared
  storyTitle: string;    // Shown in the modal heading for context
  userId: number | null; // The logged-in user's ID; null if not logged in
};

// ── Toast state type ──────────────────────────────────────────
// Controls the short-lived success / error message shown after submitting
type Toast = { message: string; type: 'success' | 'error' } | null;

export default function DareAFriend({ storyId, storyTitle, userId }: Props) {
  // Whether the dare modal is currently visible
  const [open, setOpen] = useState(false);

  // The username of the friend being dared (typed by the user)
  const [receiverUsername, setReceiverUsername] = useState('');

  // Optional personal scary message from the sender
  const [message, setMessage] = useState('');

  // True while the POST request is in-flight — disables the button to prevent double-sends
  const [sending, setSending] = useState(false);

  // Holds a temporary toast notification (success or error)
  const [toast, setToast] = useState<Toast>(null);

  // ── showToast — display a notification then auto-dismiss it ─
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    // Auto-clear the toast after 3 seconds so it doesn't linger
    setTimeout(() => setToast(null), 3000);
  };

  // ── openModal — reset form fields before showing modal ──────
  const openModal = () => {
    setReceiverUsername('');
    setMessage('');
    setOpen(true);
  };

  // ── closeModal — hide the modal overlay ─────────────────────
  const closeModal = () => setOpen(false);

  // ── sendDare — POST the dare to the API ─────────────────────
  const sendDare = async () => {
    // Username is required; message is optional
    if (!receiverUsername.trim()) return;

    setSending(true);

    try {
      const res = await fetch('/api/dares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the story, the logged-in sender, the target username, and the optional message
        body: JSON.stringify({
          storyId,
          senderId: userId,
          receiverUsername: receiverUsername.trim(),
          message: message.trim() || undefined, // omit message key if blank
        }),
      });

      if (res.ok) {
        // Dare created — show success toast, close modal, reset fields
        showToast('Dare sent! 💀', 'success');
        closeModal();
        setReceiverUsername('');
        setMessage('');
      } else {
        // API returned an error (e.g. user not found, can't dare yourself)
        const data = await res.json();
        showToast(data.error ?? 'Something went wrong.', 'error');
      }
    } catch {
      // Network failure or unexpected exception
      showToast('Failed to send dare. Try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* ── Trigger button ──────────────────────────────────── */}
      {/* Shown on the story page; hidden (greyed) when not logged in */}
      <button
        onClick={userId ? openModal : undefined}
        title={!userId ? 'Log in to dare a friend' : undefined}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition border ${
          userId
            ? 'border-red-700 text-red-400 hover:bg-red-700 hover:text-white'
            : 'border-gray-700 text-gray-600 cursor-not-allowed'
        }`}
      >
        {/* Ghost emoji + label */}
        <span>👻</span>
        <span>Dare a Friend</span>
      </button>

      {/* ── Toast notification ───────────────────────────────── */}
      {/* Appears in the bottom-right corner and auto-dismisses */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-red-700 text-white'
              : 'bg-gray-800 border border-red-600 text-red-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Modal overlay ────────────────────────────────────── */}
      {/* Clicking outside the panel (on the dark backdrop) closes the modal */}
      {open && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeModal} // backdrop click closes
        >
          {/* Modal panel — stopPropagation prevents backdrop click from firing when clicking inside */}
          <div
            className="relative w-full max-w-md mx-4 bg-gray-950 border border-red-900/60 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Close button (top-right X) ───────────────── */}
            <button
              onClick={closeModal}
              aria-label="Close"
              className="absolute top-4 right-4 text-gray-600 hover:text-red-400 transition text-lg leading-none"
            >
              ✕
            </button>

            {/* ── Modal heading ────────────────────────────── */}
            <h2 className="text-xl font-bold text-white mb-1">👻 Dare a Friend</h2>
            <p className="text-sm text-gray-500 mb-6">
              Challenge someone to read{' '}
              <span className="text-red-400 font-medium">"{storyTitle}"</span>
            </p>

            {/* ── Username field ───────────────────────────── */}
            {/* The sender types the username of whoever they want to dare */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                Their Username
              </label>
              <input
                type="text"
                value={receiverUsername}
                onChange={(e) => setReceiverUsername(e.target.value)}
                placeholder="e.g. spooky_reader"
                autoComplete="off"
                className="w-full bg-gray-900 border border-gray-700 focus:border-red-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition"
              />
            </div>

            {/* ── Optional scary message textarea ──────────── */}
            {/* The sender can personalise the dare with a taunting note */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                Scary Message{' '}
                <span className="text-gray-600 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="I dare you to read this alone at midnight…"
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 focus:border-red-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none resize-none transition"
              />
            </div>

            {/* ── Send button ──────────────────────────────── */}
            {/* Disabled while sending or when username field is empty */}
            <button
              onClick={sendDare}
              disabled={sending || !receiverUsername.trim()}
              className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm tracking-wide"
            >
              {sending ? 'Sending…' : 'Send the Dare'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
