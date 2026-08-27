// app/api/stripe/story/checkout/route.ts
// Creates a one-time Stripe Checkout Session for purchasing a paid story.
// Free stories (price null or 0) are rejected here so we never create a $0 charge.
// If the user has already purchased the story we return early with alreadyPurchased:true
// so the frontend can immediately unlock the content without showing Stripe at all.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getSessionUserId } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // The buyer is always the caller. `userId` used to come from the request
    // body with no authentication, so a checkout could be started that granted
    // the purchased story to somebody else's account.
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'You must be logged in to purchase.' }, { status: 401 });
    }

    const body = await request.json();
    const { storyId } = body as { storyId: number };

    // Validate required fields before doing any DB work
    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
    }

    // Fetch the story from the database — we need its price and title to build
    // the Stripe line item and validate that it's actually a paid story.
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        title: true,
        price: true, // Price in cents; null means free
        status: true, // Only published stories should be purchasable
      },
    });

    // 404 if the story doesn't exist
    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Prevent purchasing unpublished stories (drafts, archived)
    if (story.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'This story is not available for purchase' },
        { status: 400 }
      );
    }

    // A null or zero price means the story is free — no Stripe session needed.
    // Return 400 so the frontend knows to just show the content directly.
    if (!story.price || story.price === 0) {
      return NextResponse.json(
        { error: 'This story is free and does not require purchase' },
        { status: 400 }
      );
    }

    // Check whether the user has already paid for this story.
    // The StoryPurchase table has a unique constraint on (userId, storyId),
    // so if a row exists the user already owns it.
    const existingPurchase = await prisma.storyPurchase.findUnique({
      where: {
        userId_storyId: { userId, storyId }, // Prisma compound unique lookup
      },
      select: { id: true },
    });

    if (existingPurchase) {
      // Return a special flag so the UI can unlock the story immediately
      // without redirecting to Stripe's checkout page.
      return NextResponse.json({ alreadyPurchased: true });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // Build the one-time Checkout Session for the story purchase.
    // We use inline price_data because each story can have a different price.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time charge, not a subscription
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: story.price, // Already stored in cents in the DB
            product_data: {
              name: story.title,
              description: 'Unlock this horror story on Silent Evidence',
            },
          },
          quantity: 1,
        },
      ],
      // After payment, redirect to the story page — it will now be unlocked
      // because the webhook will have created the StoryPurchase record.
      success_url: `${baseUrl}/story/${storyId}?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/story/${storyId}`,
      // These metadata fields are forwarded to our webhook handler, which uses
      // them to create the StoryPurchase row and link the payment to the correct
      // user and story without any additional DB queries.
      metadata: {
        type: 'story_purchase', // Tells the webhook which action to perform
        userId: String(userId),
        storyId: String(storyId),
        amount: String(story.price),
      },
    });

    // Return the Stripe-hosted checkout URL for the client to redirect to
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/story/checkout] Error:', error);
    return NextResponse.json({ error: 'Failed to create story checkout session' }, { status: 500 });
  }
}
