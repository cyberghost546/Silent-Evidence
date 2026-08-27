// app/api/stripe/author/checkout/route.ts
// Creates a Stripe Checkout Session for the Author Pro plan (monthly or yearly).
// Stripe redirects the writer to its hosted checkout page and calls our webhook
// when payment completes, which is what actually grants access.
//
// The session carries metadata.type = 'author_subscription' so the webhook can
// tell an Author Pro purchase apart from a reader membership. Both are Stripe
// subscriptions on the same customer, so without that marker the webhook would
// write the wrong table.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { unauthorized, badRequest, serverError } from '@/lib/apiError';

export async function POST(request: NextRequest) {
  // Identify the buyer from their session cookie rather than from the request
  // body. Taking the userId from the body would let a caller start a checkout
  // that grants Author Pro to an account other than their own.
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const body = await request.json();
    const { plan } = body as { plan: 'monthly' | 'yearly' };

    if (plan !== 'monthly' && plan !== 'yearly') {
      return badRequest('plan must be "monthly" or "yearly"');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });
    if (!user) return badRequest('User not found');

    // Reuse an existing Stripe customer wherever one exists. A user may already
    // have one from a reader membership — reusing it keeps a single billing
    // identity, so their portal shows both subscriptions and one payment method
    // rather than two disconnected customer records.
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

    let stripeCustomerId = authorSub?.stripeCustomerId ?? readerSub?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: { userId: String(userId) },
      });
      stripeCustomerId = customer.id;
    }

    const priceId =
      plan === 'monthly'
        ? process.env.STRIPE_AUTHOR_MONTHLY_PRICE_ID
        : process.env.STRIPE_AUTHOR_YEARLY_PRICE_ID;

    // Fail clearly rather than handing Stripe an undefined price and getting
    // back an opaque API error.
    if (!priceId) {
      console.error(`[stripe/author/checkout] Missing price ID env var for plan "${plan}"`);
      return serverError('Author Pro plans are not configured yet.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/author-pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/author-pro`,
      metadata: {
        // The webhook branches on this. Without it, the session would fall
        // through to the reader-subscription handler.
        type: 'author_subscription',
        userId: String(userId),
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/author/checkout] Error:', error);
    return serverError('Failed to create checkout session');
  }
}
