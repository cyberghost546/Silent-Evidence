// app/api/stripe/portal/route.ts
// GET /api/stripe/portal — redirects the user to the Stripe Customer Portal.
// The portal lets subscribers manage their subscription: update payment method,
// change plan, view invoices, or cancel — all hosted by Stripe so we don't
// need to build these UIs ourselves.
//
// Requires the user to be logged in and have an existing Stripe customer ID
// stored in their Subscription record.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export async function GET() {
  // Get the logged-in user from the session cookie
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  // Look up the user's Stripe customer ID from their subscription record
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    // User doesn't have a subscription — redirect to the premium page instead
    return NextResponse.redirect(`${BASE_URL}/premium`);
  }

  // Create a Stripe billing portal session — Stripe hosts the entire management UI
  // The return_url is where Stripe sends the user after they're done managing
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${BASE_URL}/premium`,
  });

  // Redirect the user to the Stripe-hosted portal page
  return NextResponse.redirect(portalSession.url);
}
