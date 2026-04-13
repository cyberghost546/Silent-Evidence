// app/api/bundles/[slug]/purchase/route.ts
// POST — creates a Stripe Checkout Session for buying a story bundle.
// On success Stripe redirects to /bundles/success?session_id=...
// On cancel Stripe redirects back to /bundle/[slug].

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Please log in to purchase.' }, { status: 401 });

  const { slug } = await params;
  const bundle = await prisma.storyBundle.findUnique({
    where: { slug, active: true },
    select: { id: true, title: true, price: true, coverImage: true },
  });
  if (!bundle) return NextResponse.json({ error: 'Bundle not found.' }, { status: 404 });
  if (bundle.price <= 0) return NextResponse.json({ error: 'This bundle is free.' }, { status: 400 });

  // Check if user already bought this bundle
  const existing = await prisma.bundlePurchase.findUnique({
    where: { userId_bundleId: { userId, bundleId: bundle.id } },
  });
  if (existing) return NextResponse.json({ error: 'You already own this bundle.' }, { status: 409 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  // Create a one-time Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user?.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: bundle.price,
          product_data: {
            name: bundle.title,
            description: `Story bundle on Silent Evidence`,
            ...(bundle.coverImage ? { images: [bundle.coverImage] } : {}),
          },
        },
      },
    ],
    metadata: {
      userId: String(userId),
      bundleId: String(bundle.id),
      bundleSlug: slug,
    },
    success_url: `${BASE_URL}/bundles/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL}/bundle/${slug}`,
  });

  return NextResponse.json({ url: session.url });
}
