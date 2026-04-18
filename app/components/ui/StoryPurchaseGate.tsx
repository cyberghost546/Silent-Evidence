'use client';
// StoryPurchaseGate.tsx
// Wraps a story's body content and decides whether to show it or block it.
//
// Access rules (evaluated top-to-bottom, first match wins):
//   1. User has already purchased this specific story  → show content
//   2. isPremiumOnly AND user is subscribed            → show content (subscription covers it)
//   3. price is 0 / null AND story is NOT premiumOnly  → show content (free story)
//   4. Everything else                                  → show locked gate overlay

import { useState } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  storyId: number;          // Used to create the Stripe checkout session
  storyTitle: string;       // Shown inside the gate card
  price: number;            // In dollars (e.g. 1.99). 0 or null = free
  userId: number | null;    // null when visitor is not authenticated
  hasPurchased: boolean;    // True when the DB says this user bought this story
  isPremiumOnly: boolean;   // True when only subscribers can read for free
  isSubscribed: boolean;    // True when the user has an active premium subscription
  children: React.ReactNode; // The actual rendered story HTML / components
};

// ── Component ────────────────────────────────────────────────────────────────

export default function StoryPurchaseGate({
  storyId,
  storyTitle,
  price,
  userId,
  hasPurchased,
  isPremiumOnly,
  isSubscribed,
  children,
}: Props) {
  // true while we wait for the Stripe checkout API to respond
  const [loading, setLoading] = useState(false);

  // Any error message returned by the API
  const [error, setError] = useState<string | null>(null);

  // ── Access check ───────────────────────────────────────────────────────────

  // Rule 1: user explicitly purchased this story
  if (hasPurchased) return <>{children}</>;

  // Rule 2: story requires a subscription and user is subscribed
  if (isPremiumOnly && isSubscribed) return <>{children}</>;

  // Rule 3: story is free (price absent or zero) and not premium-gated
  if ((!price || price <= 0) && !isPremiumOnly) return <>{children}</>;

  // ── Locked gate ────────────────────────────────────────────────────────────

  // Handler for the "Unlock Story" button — creates a Stripe one-time purchase session
  const handleUnlock = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/story/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not start checkout. Try again.');
      }

      const { url } = await res.json();
      // Navigate to Stripe's hosted payment page
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  return (
    // Outer wrapper is position:relative so the overlay can cover just the content area
    <div className="relative">

      {/* ── Blurred content preview ─────────────────────────────────────────
          We render the actual children but blur them heavily so readers get a
          taste of the content without being able to read it.                 */}
      <div
        className="select-none pointer-events-none"
        style={{
          // Progressive blur/fade: visible at top, fully obscured below ~200px
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%)',
          filter: 'blur(4px)',
          maxHeight: '220px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* ── Dark overlay + gate card ─────────────────────────────────────── */}
      <div className="
        absolute inset-0 flex items-center justify-center
        bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent
      ">
        <div className="
          w-full max-w-sm mx-4 p-6 rounded-2xl text-center
          bg-gray-900/95 border border-gray-700/60
          shadow-[0_0_40px_rgba(0,0,0,0.8)]
        ">

          {/* Lock icon */}
          <div className="text-4xl mb-3">🔒</div>

          {/* Headline */}
          <h3 className="text-lg font-bold text-white mb-1">This story is locked</h3>

          {/* Story title for context */}
          <p className="text-sm text-gray-500 mb-4 truncate">{storyTitle}</p>

          {/* ── Gate variant: premium-only story ──────────────────────────── */}
          {isPremiumOnly ? (
            <>
              <p className="text-sm text-amber-400 font-semibold mb-1">
                ⚡ Premium members only
              </p>
              <p className="text-xs text-gray-500 mb-5">
                Subscribe to Horror Elite to read all premium stories.
              </p>
              <Link
                href="/premium"
                className="
                  inline-block w-full py-2.5 rounded-xl font-bold text-sm text-white
                  bg-gradient-to-r from-yellow-500 to-amber-400
                  hover:from-yellow-400 hover:to-amber-300
                  shadow-[0_0_12px_rgba(251,191,36,0.4)]
                  transition text-gray-900
                "
              >
                View Premium Plans ⚡
              </Link>
            </>
          ) : (
            <>
              {/* ── Gate variant: one-time purchase story ─────────────────── */}
              <p className="text-2xl font-extrabold text-white mb-5">
                Unlock for{' '}
                <span className="text-red-400">${price.toFixed(2)}</span>
              </p>

              {/* Error from the checkout API */}
              {error && (
                <p className="text-red-400 text-xs mb-3">{error}</p>
              )}

              {/* Not logged in → prompt login instead of showing checkout */}
              {userId === null ? (
                <a
                  href="/login"
                  className="
                    inline-block w-full py-2.5 rounded-xl font-bold text-sm text-white
                    bg-red-600 hover:bg-red-700 border border-red-500 transition
                  "
                >
                  Log in to unlock
                </a>
              ) : (
                <button
                  onClick={handleUnlock}
                  disabled={loading}
                  className="
                    w-full py-2.5 rounded-xl font-bold text-sm text-white
                    bg-red-600 hover:bg-red-700 border border-red-500
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition flex items-center justify-center gap-2
                  "
                >
                  {loading ? (
                    // Spinner shown while waiting for Stripe checkout URL
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none" viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Redirecting…
                    </>
                  ) : (
                    'Unlock Story'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
