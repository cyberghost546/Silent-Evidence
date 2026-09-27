// lib/earnings.ts
//
// Computes what an author has earned, from the payment records the app already
// keeps. Earnings come from four sources, all crediting the author:
//   - Tips received                (Tip.toUserId)
//   - Purchases of their stories    (StoryPurchase → Story.authorId)
//   - Purchases of their chapters   (ChapterPurchase → StoryChapter → Story.authorId)
//   - Purchases of their bundles    (BundlePurchase → StoryBundle.authorId)
//
// The platform takes a fixed cut (PLATFORM_FEE_BPS); the author keeps the rest.
// AuthorSubscription is deliberately NOT counted here — that is the author paying
// the platform for the Author Pro plan, not money owed to them.
//
// All amounts are in cents. Stripe's own processing fees are separate and are
// deducted by Stripe at transfer time, not modelled here.

import { prisma } from '@/lib/prisma';

// Platform fee in basis points (1% = 100 bps). 1000 = 10%. Kept as one constant
// so the split can be changed in a single place; it is used by both the earnings
// math and the payout transfer.
export const PLATFORM_FEE_BPS = 1000;

/** The author's share of a gross amount, in cents, after the platform fee. */
export function authorShare(grossCents: number): number {
  return Math.round((grossCents * (10000 - PLATFORM_FEE_BPS)) / 10000);
}

/** The platform's share of a gross amount, in cents. */
export function platformShare(grossCents: number): number {
  return grossCents - authorShare(grossCents);
}

export interface EarningsBreakdown {
  /** Gross (pre-fee) totals by source, in cents. */
  gross: { tips: number; stories: number; chapters: number; bundles: number; total: number };
  /** Author's net share after the platform fee, in cents. */
  net: number;
  /** Platform fee taken, in cents. */
  fee: number;
  feeBps: number;
  /** Net already paid out to the author, in cents. */
  paidOut: number;
  /** Net earned but not yet paid out, in cents. */
  available: number;
  counts: { tips: number; stories: number; chapters: number; bundles: number };
}

/**
 * Sums an author's gross earnings by source. A single pass of four aggregate
 * queries; each is indexed on the author/target column.
 */
async function grossBySource(authorId: number, since?: Date) {
  const dateFilter = since ? { gt: since } : undefined;

  const [tips, stories, chapters, bundles] = await Promise.all([
    prisma.tip.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { toUserId: authorId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    }),
    prisma.storyPurchase.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { story: { authorId }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    }),
    prisma.chapterPurchase.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { chapter: { story: { authorId } }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    }),
    prisma.bundlePurchase.aggregate({
      _sum: { paidCents: true },
      _count: true,
      where: { bundle: { authorId }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    }),
  ]);

  return {
    tips: { sum: tips._sum.amount ?? 0, count: tips._count },
    stories: { sum: stories._sum.amount ?? 0, count: stories._count },
    chapters: { sum: chapters._sum.amount ?? 0, count: chapters._count },
    bundles: { sum: bundles._sum.paidCents ?? 0, count: bundles._count },
  };
}

/** Full earnings picture for an author, including how much is still owed. */
export async function getEarnings(authorId: number): Promise<EarningsBreakdown> {
  const g = await grossBySource(authorId);
  const grossTotal = g.tips.sum + g.stories.sum + g.chapters.sum + g.bundles.sum;

  const net = authorShare(grossTotal);
  const fee = grossTotal - net;

  // Sum of completed payouts (net amounts already transferred).
  const paid = await prisma.payout.aggregate({
    _sum: { amountCents: true },
    where: { authorId, status: 'paid' },
  });
  const paidOut = paid._sum.amountCents ?? 0;

  return {
    gross: {
      tips: g.tips.sum,
      stories: g.stories.sum,
      chapters: g.chapters.sum,
      bundles: g.bundles.sum,
      total: grossTotal,
    },
    net,
    fee,
    feeBps: PLATFORM_FEE_BPS,
    paidOut,
    available: Math.max(0, net - paidOut),
    counts: {
      tips: g.tips.count,
      stories: g.stories.count,
      chapters: g.chapters.count,
      bundles: g.bundles.count,
    },
  };
}
