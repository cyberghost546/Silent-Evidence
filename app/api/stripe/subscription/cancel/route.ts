// app/api/stripe/subscription/cancel/route.ts
// Immediately cancels a user's active Stripe subscription and marks it as
// canceled in our database.  Note: Stripe also fires a `customer.subscription.deleted`
// webhook after the cancel call, but we update the DB here immediately so the UI
// reflects the change without waiting for the webhook round-trip.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getSessionUserId } from '@/lib/session';

export async function POST() {
  try {
    // Identify the caller from their signed session cookie.
    //
    // This route previously took `userId` from the request body and performed no
    // authentication at all, so an unauthenticated POST of {"userId": 42} would
    // immediately cancel user 42's subscription at Stripe — destroying access
    // they had paid for. A user may now only ever cancel their own subscription.
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    // Fetch the subscription row so we can get the Stripe subscription ID.
    // We need the stripeSubscriptionId to call Stripe's cancel API.
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        id: true,
        stripeSubscriptionId: true,
        status: true,
      },
    });

    // Guard: user doesn't have a subscription record at all
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found for this user' }, { status: 404 });
    }

    // Guard: the subscription is already canceled — nothing to do
    if (subscription.status === 'canceled') {
      return NextResponse.json({ error: 'Subscription is already canceled' }, { status: 400 });
    }

    // Guard: the Stripe subscription ID is missing, which means the webhook
    // that activates subscriptions hasn't fired yet (very edge-case).
    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'Subscription is not yet active on Stripe' },
        { status: 400 }
      );
    }

    // Tell Stripe to cancel the subscription immediately.
    // This ends access right away rather than at the end of the billing period.
    // If you want "cancel at period end" behaviour, pass { cancel_at_period_end: true }
    // to stripe.subscriptions.update() instead.
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

    // Reflect the canceled status in our database immediately so the frontend
    // doesn't have to wait for the webhook to update the user's access level.
    await prisma.subscription.update({
      where: { userId },
      data: { status: 'canceled' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[stripe/subscription/cancel] Error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
