'use client';
// TipButton.tsx
// Renders a "Send a Tip" button that opens an inline modal.
// The modal lets a logged-in reader choose a tip amount, optionally add a message,
// then redirects to a Stripe-hosted checkout session for payment.

import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  toUserId: number; // The author receiving the tip
  toUsername: string; // Shown in the modal title
  fromUserId: number | null; // null when the visitor is not logged in
};

// Fixed tip amounts in US dollars — keeps the UX simple and fast
const TIP_AMOUNTS = [1, 3, 5, 10];

// ── Component ────────────────────────────────────────────────────────────────

export default function TipButton({ toUserId, toUsername, fromUserId }: Props) {
  // Controls whether the tip modal is visible
  const [open, setOpen] = useState(false);

  // Which dollar amount the user has selected (default to $3 as a sensible middle)
  const [selectedAmount, setSelectedAmount] = useState<number>(3);

  // Optional personal message the tipper can leave for the author
  const [message, setMessage] = useState('');

  // true while waiting for the API to return a checkout URL
  const [loading, setLoading] = useState(false);

  // Stores any API error message to show in the UI
  const [error, setError] = useState<string | null>(null);

  // ── Submit handler ─────────────────────────────────────────────────────────

  const handleSend = async () => {
    setLoading(true);
    setError(null);

    try {
      // POST the tip details to our server-side Stripe checkout creator
      const res = await fetch('/api/stripe/tip/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId,
          // Cents, not dollars. TIP_AMOUNTS is in dollars for display, but the
          // API contract (and Stripe's unit_amount) is the smallest currency
          // unit. This used to send dollars with a comment claiming the API
          // converted them — it does not, so every tip was rejected by the
          // server's `amount < 100` minimum check.
          amount: selectedAmount * 100,
          message: message.trim(), // Empty string is fine — message is optional
        }),
      });

      if (!res.ok) {
        // Surface a readable error instead of crashing silently
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Something went wrong. Try again.');
      }

      const { url } = await res.json();
      // Redirect the whole tab to Stripe's hosted checkout page
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
    // Note: we intentionally leave loading=true after a successful redirect
    // so the button stays in the "redirecting…" state until the page navigates.
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="
          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
          bg-emerald-600 hover:bg-emerald-500 text-white
          border border-emerald-500 transition
          shadow-[0_0_10px_rgba(16,185,129,0.3)]
        "
      >
        Send a Tip
      </button>

      {/* ── Modal backdrop + panel ───────────────────────────────────────── */}
      {open && (
        // Semi-transparent overlay dims the page behind the modal
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            // Close the modal when clicking outside the card
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-sm mx-4 bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            {/* Close button — top-right corner */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-300 text-xl leading-none"
              aria-label="Close tip panel"
            >
              ×
            </button>

            {/* Title */}
            <h2 className="text-lg font-bold text-white mb-1">
              Support <span className="text-red-400">@{toUsername}</span>&apos;s writing
            </h2>
            <p className="text-xs text-gray-500 mb-5">Tips go directly to the author.</p>

            {/* ── Not logged in guard ─────────────────────────────────── */}
            {fromUserId === null ? (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-3">You must be logged in to send a tip.</p>
                <a
                  href="/login"
                  className="inline-block px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  Log in
                </a>
              </div>
            ) : (
              <>
                {/* ── Amount selector ──────────────────────────────────── */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {TIP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedAmount(amount)}
                      className={`
                        py-2 rounded-lg text-sm font-bold border transition
                        ${
                          selectedAmount === amount
                            ? /* Highlighted: solid red — clearly selected */
                              'bg-red-600 border-red-500 text-white shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                            : /* Inactive: dark ghost button */
                              'bg-gray-800 border-gray-700 text-gray-300 hover:border-red-500/50 hover:text-white'
                        }
                      `}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                {/* ── Optional message ─────────────────────────────────── */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message... (optional)"
                  rows={3}
                  maxLength={280}
                  className="
                    w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                    text-sm text-white placeholder-gray-600
                    focus:outline-none focus:border-red-500/60
                    resize-none mb-4
                  "
                />

                {/* ── Error message ────────────────────────────────────── */}
                {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

                {/* ── Submit button ────────────────────────────────────── */}
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="
                    w-full py-2.5 rounded-xl font-bold text-sm text-white
                    bg-red-600 hover:bg-red-700 border border-red-500
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition flex items-center justify-center gap-2
                  "
                >
                  {loading ? (
                    // Spinning ring while waiting for Stripe redirect
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Redirecting…
                    </>
                  ) : (
                    <>Send Tip</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
