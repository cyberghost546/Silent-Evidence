'use client';
// SubscribeButtons.tsx
// Client component used by app/premium/page.tsx to handle the subscribe button clicks.
// Kept separate because the parent pricing page is a Server Component and cannot
// directly attach onClick handlers — Next.js requires interactive parts to be
// isolated in their own 'use client' files.

import { useState } from 'react';

type Props = {
  plan: string;           // 'monthly' | 'yearly' — passed to the API
  cta: string;            // Button label text (e.g. "Subscribe Monthly")
  highlight: boolean;     // Yearly plan gets the gold gradient CTA
  userId: number | null;  // null when the visitor is not logged in
  isSubscribed: boolean;  // Hides the button entirely if already subscribed
};

export default function SubscribeButtons({ plan, cta, highlight, userId, isSubscribed }: Props) {
  // true while we wait for the checkout API response
  const [loading, setLoading] = useState(false);

  // Error message from the API shown inline below the button
  const [error, setError] = useState<string | null>(null);

  // If the user already has an active subscription, replace the CTA with a
  // neutral "active" indicator — no need to subscribe again.
  if (isSubscribed) {
    return (
      <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-yellow-400 border border-yellow-500/30 bg-yellow-500/10">
 Active plan
      </div>
    );
  }

  // If not logged in, show a login prompt instead of trying to start checkout
  if (!userId) {
    return (
      <a
        href="/login"
        className="
          block w-full py-2.5 rounded-xl text-center text-sm font-semibold
          bg-gray-800 border border-gray-700 text-gray-300
          hover:border-red-500/50 hover:text-white transition
        "
      >
        Log in to subscribe
      </a>
    );
  }

  // Handler: POST to the subscription checkout endpoint and redirect to Stripe
  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }), // 'monthly' or 'yearly'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not start checkout. Try again.');
      }

      const { url } = await res.json();
      // Navigate to Stripe's hosted checkout — user enters card details there
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
    // Leave loading=true on success; the page redirect will unload the component
  };

  return (
    <div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className={`
          w-full py-2.5 rounded-xl text-sm font-bold
          disabled:opacity-60 disabled:cursor-not-allowed
          transition flex items-center justify-center gap-2
          ${highlight
            /* Yearly plan: gold gradient to match its premium emphasis */
            ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 hover:from-yellow-300 hover:to-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.35)]'
            /* Monthly plan: standard green CTA */
            : 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
          }
        `}
      >
        {loading ? (
          // Spinner while waiting for Stripe redirect
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
          cta
        )}
      </button>

      {/* Inline error from the API */}
      {error && (
        <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
