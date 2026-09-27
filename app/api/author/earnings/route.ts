// app/api/author/earnings/route.ts
//
// GET — the signed-in author's earnings breakdown and payout status. Reads only
// their own figures; there is no way to query another author's earnings here.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { unauthorized, serverError } from '@/lib/apiError';
import { getEarnings } from '@/lib/earnings';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const [earnings, user, recentPayouts] = await Promise.all([
      getEarnings(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { stripeConnectId: true, stripeConnectOnboarded: true },
      }),
      prisma.payout.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, amountCents: true, status: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      earnings,
      payouts: recentPayouts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
      connect: {
        started: Boolean(user?.stripeConnectId),
        onboarded: Boolean(user?.stripeConnectOnboarded),
      },
      // Surfaces whether the payout rails are even configured, so the UI can
      // explain "earnings are tracked; payouts open once set up" honestly.
      payoutsConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    });
  } catch (err) {
    console.error('[GET /api/author/earnings]', err);
    return serverError();
  }
}
