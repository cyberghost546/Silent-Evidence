// app/api/stripe/tip/checkout/route.ts
// Creates a one-time Stripe Checkout Session for a reader tipping an author.
// Tips use `mode: 'payment'` (not 'subscription') because they're one-off charges.
// The actual Tip record in our DB is created by the webhook after Stripe confirms
// payment, so we never record a tip unless money has actually changed hands.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getSessionUserId } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // The sender is always the caller. `fromUserId` used to be taken from the
    // request body with no authentication, so a tip could be attributed to any
    // account — the webhook writes metadata.fromUserId straight into the Tip
    // row, meaning the public tip history was forgeable by anyone.
    const fromUserId = await getSessionUserId();
    if (!fromUserId) {
      return NextResponse.json({ error: 'You must be logged in to tip.' }, { status: 401 });
    }

    const body = await request.json();
    const { toUserId, amount, message } = body as {
      toUserId: number;
      amount: number; // Amount in cents, e.g. 500 = $5.00
      message?: string; // Optional note from the reader to the author
    };

    // Validate all required fields upfront
    if (!toUserId || !amount) {
      return NextResponse.json({ error: 'toUserId and amount are required' }, { status: 400 });
    }

    // Enforce a minimum tip of $1.00 (Stripe's minimum charge threshold)
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Minimum tip amount is $1.00 (100 cents)' },
        { status: 400 }
      );
    }

    // Prevent users from tipping themselves (bad UX and bad accounting)
    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'You cannot tip yourself' }, { status: 400 });
    }

    // Look up the author (recipient) so we can show their name in the Stripe UI.
    // This also confirms the toUserId actually exists before we create a session.
    const author = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { username: true },
    });

    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // Create the Stripe Checkout Session for a one-time payment.
    // We use `price_data` (inline price) rather than a pre-built Stripe Price
    // because tip amounts are variable — you can't pre-define every possible amount.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time charge, not a recurring subscription
      line_items: [
        {
          price_data: {
            currency: 'usd',
            // unit_amount is in the smallest currency unit (cents for USD)
            unit_amount: amount,
            product_data: {
              // Personalise the checkout page with the author's name
              name: `Tip for ${author.username}`,
              description: message || 'A tip from a fan!',
            },
          },
          quantity: 1,
        },
      ],
      // After a successful payment, redirect to the author's profile.
      // The session_id lets the success page show a thank-you confirmation.
      success_url: `${baseUrl}/profile/${author.username}?tip=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/profile/${author.username}`,
      // All metadata is forwarded to the webhook payload.
      // The webhook uses these fields to create the Tip record in our DB.
      metadata: {
        type: 'tip', // Tells the webhook which DB action to take
        fromUserId: String(fromUserId),
        toUserId: String(toUserId),
        amount: String(amount),
        message: message || '',
      },
    });

    // Return the Stripe-hosted URL — the client redirects the user to it
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/tip/checkout] Error:', error);
    return NextResponse.json({ error: 'Failed to create tip checkout session' }, { status: 500 });
  }
}
