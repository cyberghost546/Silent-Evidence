'use client';
// ============================================================
// FILE: BundlePurchaseButton.tsx
// PURPOSE: A single button that starts the Stripe Checkout flow for a
//          story bundle. When the user clicks it, the app calls the server
//          to create a Stripe Checkout Session and then redirects the browser
//          to the Stripe-hosted payment page.
//
// HOW STRIPE CHECKOUT WORKS (simplified):
//   1. Client calls POST /api/bundles/[slug]/purchase
//   2. Server creates a Stripe Checkout Session and returns { url: "https://checkout.stripe.com/..." }
//   3. Client sets window.location.href to that URL → browser goes to Stripe
//   4. After payment, Stripe redirects back to /bundles/success (configured server-side)
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Replace the fetch URL with your own Checkout Session creation endpoint.
//   - The pattern (call API → get URL → redirect) is the same for any
//     Stripe Checkout integration.
//   - Guests are redirected to /login before any payment logic runs.
//   - The price=0 case shows "Get for Free" — useful for free tiers.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  slug: string;
  price: number;       // in cents
  isLoggedIn: boolean;
};

export default function BundlePurchaseButton({ slug, price, isLoggedIn }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const buy = async () => {
    if (!isLoggedIn) { router.push('/login'); return; }
    setLoading(true);
    const res  = await fetch(`/api/bundles/${slug}/purchase`, { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (data.url) window.location.href = data.url;
  };

  return (
    <button
      onClick={buy}
      disabled={loading}
      className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm"
    >
      {loading ? 'Redirecting…' : price === 0 ? 'Get for Free' : `Buy for $${(price / 100).toFixed(2)}`}
    </button>
  );
}
