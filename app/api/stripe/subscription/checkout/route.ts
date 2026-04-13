// app/api/stripe/subscription/checkout/route.ts
// Creates a Stripe Checkout Session for premium membership (monthly or yearly).
// The user is redirected to Stripe's hosted checkout page, and Stripe calls
// the webhook when payment completes to record the subscription in our DB.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body to get userId and chosen plan
    const body = await request.json();
    const { userId, plan } = body as { userId: number; plan: 'monthly' | 'yearly' };

    // Validate required fields before touching Stripe or the DB
    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'userId and plan are required' },
        { status: 400 }
      );
    }

    if (plan !== 'monthly' && plan !== 'yearly') {
      return NextResponse.json(
        { error: 'plan must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Look up the user so we can attach their name/email to the Stripe customer.
    // If the user doesn't exist we return 404 immediately to avoid creating
    // orphaned Stripe customers.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check whether we already have a Stripe customer ID stored for this user.
    // If the Subscription row exists and has a stripeCustomerId, reuse it so
    // the user's billing history stays on one Stripe customer record.
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });

    let stripeCustomerId: string;

    if (existingSubscription?.stripeCustomerId) {
      // Reuse the existing Stripe customer — no duplicate records on Stripe's side
      stripeCustomerId = existingSubscription.stripeCustomerId;
    } else {
      // Create a brand-new Stripe customer linked to this user's email
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        // Store our internal userId in Stripe metadata so we can look the user
        // up later without an extra DB query (useful in the webhook handler).
        metadata: { userId: String(userId) },
      });
      stripeCustomerId = customer.id;
    }

    // Choose the correct Stripe Price ID based on the requested plan.
    // Price IDs are set up in the Stripe dashboard and stored in env vars so
    // they can differ between dev/staging/production without code changes.
    const priceId =
      plan === 'monthly'
        ? process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!
        : process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!;

    // Build the base URL for success/cancel redirects.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // Create the Stripe Checkout Session.
    // mode: 'subscription' tells Stripe this is a recurring payment, not one-off.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId, // Tie the session to our stored customer
      line_items: [
        {
          price: priceId, // Pre-built price from Stripe dashboard
          quantity: 1,
        },
      ],
      // Stripe redirects here after a successful payment, including the session ID
      // so our success page can show a confirmation message.
      success_url: `${baseUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      // Stripe redirects here if the user clicks "back" or cancels
      cancel_url: `${baseUrl}/premium`,
      // Metadata travels with the session and is visible in the webhook payload,
      // letting us link the payment back to the correct user without extra lookups.
      metadata: {
        userId: String(userId),
        plan,
      },
    });

    // Return the Stripe-hosted checkout URL — the client will redirect the user there
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/subscription/checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
