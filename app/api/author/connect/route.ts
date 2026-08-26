// app/api/author/connect/route.ts
//
// Stripe Connect onboarding for author payouts.
//
//   POST — begin or continue onboarding. Creates an Express connected account for
//          the author if they do not have one, then returns a Stripe-hosted
//          onboarding URL to redirect them to.
//   GET  — refresh the author's onboarding status from Stripe (called when they
//          return from the hosted flow) and persist whether payouts are enabled.
//
// ⚠ REQUIRES STRIPE CONNECT to be enabled on the platform's Stripe account. This
// follows Stripe's documented Express-account flow, but could not be exercised in
// development without Connect credentials — test it end to end in Stripe test mode
// before relying on it. The money math and earnings tracking (lib/earnings.ts) are
// independent of this and are fully tested.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { verifyCsrfToken } from '@/lib/csrf';
import { getStripe } from '@/lib/stripe';
import { unauthorized, serverError } from '@/lib/apiError';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// POST — start/continue onboarding, returns a hosted onboarding URL.
export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  if (!stripeConfigured()) {
    return NextResponse.json({ error: 'Payouts are not configured on this site yet.' }, { status: 503 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeConnectId: true },
    });
    if (!user) return unauthorized();

    const stripe = getStripe();
    let accountId = user.stripeConnectId;

    // Create the connected account on first onboarding.
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        // The platform collects fees and controls payouts; the author's account
        // just needs to be able to receive transfers.
        capabilities: { transfers: { requested: true } },
        metadata: { userId: String(user.id) },
      });
      accountId = account.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeConnectId: accountId } });
    }

    // A one-time onboarding link. return_url is where Stripe sends the author when
    // done; the page then calls GET here to persist the new status.
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl()}/dashboard/earnings?connect=refresh`,
      return_url: `${baseUrl()}/dashboard/earnings?connect=return`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error('[POST /api/author/connect]', err);
    return serverError('Could not start Stripe onboarding.');
  }
}

// GET — refresh onboarding status from Stripe and persist it.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectId: true, stripeConnectOnboarded: true },
    });
    if (!user) return unauthorized();

    if (!user.stripeConnectId || !stripeConfigured()) {
      return NextResponse.json({ started: false, onboarded: false });
    }

    const account = await getStripe().accounts.retrieve(user.stripeConnectId);
    // An account can receive payouts once Stripe has enabled both transfers and
    // payouts and there are no outstanding onboarding requirements.
    const onboarded = Boolean(account.payouts_enabled && account.charges_enabled);

    if (onboarded !== user.stripeConnectOnboarded) {
      await prisma.user.update({ where: { id: userId }, data: { stripeConnectOnboarded: onboarded } });
    }

    return NextResponse.json({ started: true, onboarded });
  } catch (err) {
    console.error('[GET /api/author/connect]', err);
    return serverError('Could not check Stripe status.');
  }
}
