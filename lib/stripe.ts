// lib/stripe.ts
// Singleton Stripe client — imported by all API routes that need to talk to Stripe.
// Using a singleton prevents multiple Stripe instances from being created during
// Next.js hot-reload in development, which would waste connections.

import Stripe from 'stripe';

// The non-null assertion (!) tells TypeScript we guarantee STRIPE_SECRET_KEY is set.
// If it's missing at runtime, Stripe will throw immediately, making the problem obvious.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Pin the API version so upgrades never silently change behaviour.
  apiVersion: '2026-02-25.clover',
});
