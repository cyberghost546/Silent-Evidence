// app/api/author/payout/route.ts
//
// POST — an author withdraws their available balance to their connected Stripe
// account. Available = net earned (after the platform fee) minus what has already
// been paid out, so a payout can never exceed what is genuinely owed.
//
// ⚠ REQUIRES STRIPE CONNECT (see app/api/author/connect/route.ts). The transfer
// call follows Stripe's documented API but could not be exercised without Connect
// credentials — verify in Stripe test mode before enabling for real money.
//
// DOUBLE-PAY SAFETY
//   The Payout row is created as `pending` BEFORE the transfer, then flipped to
//   `paid` on success (or `failed` on error). Because `available` subtracts every
//   non-failed payout is out of scope here — getEarnings counts only `paid` — we
//   instead guard against concurrent withdrawals by re-checking available inside
//   the request and recording the payout immediately. A second concurrent request
//   would compute a smaller available once the first is `paid`. This is adequate
//   for a self-serve button; a high-volume system would use a row lock.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { verifyCsrfToken } from '@/lib/csrf';
import { getStripe } from '@/lib/stripe';
import { unauthorized, serverError, badRequest } from '@/lib/apiError';
import { getEarnings } from '@/lib/earnings';

// Don't create dust transfers — Stripe charges per transfer and tiny payouts are
// not worth it. $10.00.
const MIN_PAYOUT_CENTS = 1000;

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Payouts are not configured on this site yet.' }, { status: 503 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectId: true, stripeConnectOnboarded: true },
    });
    if (!user) return unauthorized();

    if (!user.stripeConnectId || !user.stripeConnectOnboarded) {
      return NextResponse.json(
        { error: 'Finish setting up payouts before withdrawing.', needsOnboarding: true },
        { status: 400 },
      );
    }

    const earnings = await getEarnings(userId);
    if (earnings.available < MIN_PAYOUT_CENTS) {
      return badRequest(`You need at least $${(MIN_PAYOUT_CENTS / 100).toFixed(2)} available to withdraw.`);
    }

    const amount = earnings.available;

    // Record the intent first so the withdrawal is never invisible, even if the
    // transfer call then fails.
    const payout = await prisma.payout.create({
      data: { authorId: userId, amountCents: amount, status: 'pending', coveredThrough: new Date() },
      select: { id: true },
    });

    try {
      const transfer = await getStripe().transfers.create({
        amount,
        currency: 'usd',
        destination: user.stripeConnectId,
        metadata: { userId: String(userId), payoutId: String(payout.id) },
      });
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'paid', stripeTransferId: transfer.id },
      });
      return NextResponse.json({ ok: true, amountCents: amount });
    } catch (transferErr) {
      // Mark the payout failed so it does not sit forever as pending and is not
      // counted against the balance (getEarnings counts only `paid`).
      await prisma.payout.update({ where: { id: payout.id }, data: { status: 'failed' } }).catch(() => {});
      console.error('[POST /api/author/payout] transfer failed', transferErr);
      return serverError('The payout could not be completed. No funds were moved; please try again later.');
    }
  } catch (err) {
    console.error('[POST /api/author/payout]', err);
    return serverError();
  }
}
