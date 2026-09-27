// app/api/stripe/subscription/status/route.ts
// Returns the current subscription status for a given user.
// The frontend calls this to decide whether to show premium content,
// disable the "upgrade" button, or show the "cancel" option.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function GET() {
  try {
    // The subscription reported is always the caller's own.
    //
    // This route previously read `?userId=42` from the query string with no
    // authentication, so anyone could enumerate any account's billing status,
    // plan and renewal date by incrementing a number. Callers no longer pass a
    // userId at all — it comes from the signed session cookie.
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    // Find the subscription record for this user.
    // We only select the fields the caller actually needs — avoids leaking
    // sensitive Stripe IDs to the client when they aren't necessary.
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        plan: true,
        currentPeriodEnd: true,
        stripeSubscriptionId: true,
      },
    });

    // If no subscription row exists, the user has never started a checkout,
    // so we return a safe "not subscribed" shape rather than a 404.
    if (!subscription) {
      return NextResponse.json({
        isActive: false,
        plan: null,
        currentPeriodEnd: null,
        status: 'inactive',
      });
    }

    // A subscription is considered "active" if its status is 'active' or 'trialing'.
    // 'past_due' and 'canceled' are treated as inactive for content gating purposes.
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    return NextResponse.json({
      isActive,
      plan: subscription.plan,
      currentPeriodEnd: subscription.currentPeriodEnd,
      status: subscription.status,
    });
  } catch (error) {
    console.error('[stripe/subscription/status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription status' }, { status: 500 });
  }
}
