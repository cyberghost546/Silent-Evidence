// app/api/stripe/subscription/status/route.ts
// Returns the current subscription status for a given user.
// The frontend calls this to decide whether to show premium content,
// disable the "upgrade" button, or show the "cancel" option.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Pull userId out of the query string, e.g. GET /api/stripe/subscription/status?userId=42
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');

    // Validate that userId was provided and is a valid number
    if (!rawUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const userId = parseInt(rawUserId, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'userId must be a number' }, { status: 400 });
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
    const isActive =
      subscription.status === 'active' || subscription.status === 'trialing';

    return NextResponse.json({
      isActive,
      plan: subscription.plan,
      currentPeriodEnd: subscription.currentPeriodEnd,
      status: subscription.status,
    });
  } catch (error) {
    console.error('[stripe/subscription/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
