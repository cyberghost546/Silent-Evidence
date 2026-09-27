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

  // Look up the user's Stripe customer ID. It can live on either subscription
  // record: a writer who bought Author Pro but never a reader membership has an
  // AuthorSubscription and no Subscription, and checking only the latter would
  // bounce them to /premium with no way to manage the plan they are paying for.
  //
  // Both plans share one Stripe customer, so whichever row we find gives the
  // same id — and the portal then lists every subscription on that customer.
  const [readerSub, authorSub] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    }),
    prisma.authorSubscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    }),
  ]);

  const stripeCustomerId = readerSub?.stripeCustomerId ?? authorSub?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    // No billing relationship at all — send them to the reader pricing page
    return NextResponse.redirect(`${BASE_URL}/premium`);
  }

  // Send the user back to whichever plan page they actually hold. An Author Pro
  // subscriber with no reader membership belongs on /author-pro, not /premium.
  const returnPath = readerSub ? '/premium' : '/author-pro';

  // Create a Stripe billing portal session — Stripe hosts the entire management UI
  // The return_url is where Stripe sends the user after they're done managing
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${BASE_URL}${returnPath}`,
  });

  // Redirect the user to the Stripe-hosted portal page
  return NextResponse.redirect(portalSession.url);
}
