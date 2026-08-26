'use client';
// app/components/ui/ChapterPurchaseGate.tsx
// Shown when a chapter requires payment to read.
// Displays the price, a buy button, and handles the Stripe payment flow.
// On success, reloads so the full chapter content becomes visible.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Load Stripe once at module level — avoids reloading on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Props {
  chapterId: number;
  chapterTitle: string;
  priceInCents: number; // e.g. 99 = $0.99
}

// ── Inner form — rendered inside the Stripe <Elements> provider ──────────────
function CheckoutForm({
  chapterId,
  priceInCents,
  onSuccess,
}: {
  chapterId: number;
  priceInCents: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    // Confirm the payment with Stripe using the card details entered
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // Don't redirect — stay on page
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed.');
      setProcessing(false);
      return;
    }

    // Tell the server to record the purchase
    if (paymentIntent?.status === 'succeeded') {
      await fetch(`/api/chapters/${chapterId}/purchase/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
      {/* Stripe card input */}
      <PaymentElement />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
      >
        {processing ? 'Processing...' : `Pay $${(priceInCents / 100).toFixed(2)} — Unlock Chapter`}
      </button>
    </form>
  );
}

// ── Main gate component ────────────────────────────────────────────────────────
export default function ChapterPurchaseGate({ chapterId, chapterTitle, priceInCents }: Props) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchased, setPurchased] = useState(false);

  // Check if already purchased on mount
  useEffect(() => {
    fetch(`/api/chapters/${chapterId}/purchase`)
      .then((r) => r.json())
      .then((d) => {
        if (d.purchased) setPurchased(true);
      });
  }, [chapterId]);

  // Request a PaymentIntent from the server
  const startPayment = async () => {
    setLoading(true);
    const res = await fetch(`/api/chapters/${chapterId}/purchase`, { method: 'POST' });
    const data = await res.json();
    setClientSecret(data.clientSecret ?? null);
    setLoading(false);
  };

  // After successful payment, refresh server data to show the full chapter
  const handleSuccess = () => router.refresh();

  if (purchased) return null; // Already purchased — parent should show content

  return (
    <div className="my-8 border border-red-500/30 bg-red-500/5 rounded-2xl p-6 text-center">
      {/* Lock icon */}

      <h3 className="text-lg font-bold text-white mb-1">{chapterTitle} — Premium Chapter</h3>
      <p className="text-gray-400 text-sm mb-4">
        Unlock this chapter for a one-time payment of{' '}
        <span className="text-white font-semibold">${(priceInCents / 100).toFixed(2)}</span>
      </p>

      {!clientSecret ? (
        // Show the unlock button before payment starts
        <button
          onClick={startPayment}
          disabled={loading}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
        >
          {loading ? 'Loading...' : `Unlock for $${(priceInCents / 100).toFixed(2)}`}
        </button>
      ) : (
        // Show Stripe payment form once we have a clientSecret
        <div className="max-w-sm mx-auto text-left mt-4">
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: 'night' } }}
          >
            <CheckoutForm
              chapterId={chapterId}
              priceInCents={priceInCents}
              onSuccess={handleSuccess}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}
