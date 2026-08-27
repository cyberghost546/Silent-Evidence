'use client';
// AuthorSubscribeButton.tsx
// Client component for app/author-pro/page.tsx — starts an Author Pro checkout.
//
// Mirrors app/premium/SubscribeButtons.tsx but posts to the AUTHOR checkout
// endpoint. The two must stay separate: they buy different products, and the
// endpoint is what tells the webhook which table to write.

import { useState } from 'react';

type Props = {
  plan: 'monthly' | 'yearly';
  cta: string;
  highlight: boolean;
  isLoggedIn: boolean;
  isAuthorPro: boolean;
};

export default function AuthorSubscribeButton({
  plan,
  cta,
  highlight,
  isLoggedIn,
  isAuthorPro,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthorPro) {
    return (
      <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-amber-400 border border-amber-500/30 bg-amber-500/10">
        Active plan
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <a
        href="/login?next=/author-pro"
        className="
          block w-full py-2.5 rounded-xl text-center text-sm font-semibold
          bg-gray-800 border border-gray-700 text-gray-300
          hover:border-amber-500/50 hover:text-white transition
        "
      >
        Log in to subscribe
      </a>
    );
  }

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/author/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not start checkout. Try again.');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
    // On success we leave loading=true — the redirect unloads the component.
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
          ${
            highlight
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-gray-900 hover:from-amber-300 hover:to-orange-300 shadow-[0_0_14px_rgba(251,191,36,0.35)]'
              : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
          }
        `}
      >
        {loading ? (
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
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Redirecting…
          </>
        ) : (
          cta
        )}
      </button>

      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
