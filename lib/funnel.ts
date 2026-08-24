// lib/funnel.ts
// Conversion-funnel instrumentation.
//
// Three stages, in order:
//   premium_viewed   — a non-subscriber opened the pricing page
//   checkout_started — they clicked through to Stripe
//   subscribed       — payment confirmed by the webhook
//
// The gaps between consecutive stages are the whole point. A big drop from
// premium_viewed to checkout_started means the pricing or the pitch is not
// landing; a big drop from checkout_started to subscribed means something is
// broken or the price is wrong. Without this, both look identical: "nobody
// subscribed".
//
// There used to be a fourth stage ahead of these, limit_reached, recording when
// a free reader hit the monthly allowance. The metered reading limit has since
// been removed, so nothing can reach it — the stage is gone rather than left to
// sit permanently at zero and make the funnel look broken.
//
// Recording is FIRE-AND-FORGET everywhere it is used. Instrumentation must never
// be able to break a page render or fail a payment — if the insert throws, the
// error is swallowed and the user's request carries on untouched.

import { prisma } from '@/lib/prisma';

export const FUNNEL_STAGES = [
  'premium_viewed',
  'checkout_started',
  'subscribed',
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

/** Human labels for the admin view. */
export const STAGE_LABELS: Record<FunnelStage, string> = {
  premium_viewed:   'Viewed pricing',
  checkout_started: 'Started checkout',
  subscribed:       'Subscribed',
};

/**
 * Dedupe window for a stage — currently daily for all of them.
 *
 * Each remaining stage is an action a reader can meaningfully repeat on
 * different days, so a day is the right granularity: reloading the pricing page
 * five times in an afternoon is one person considering it, not five.
 *
 * Kept as a function rather than a constant because the correct window is a
 * per-stage question, and the previous limit_reached stage genuinely needed a
 * monthly one.
 */
function bucketFor(_stage: FunnelStage, now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * recordFunnelEvent — note that a user reached a stage.
 *
 * Idempotent within the stage's window thanks to @@unique([event, userId,
 * bucket]): calling it repeatedly for the same user on the same day is a no-op.
 *
 * Never throws. Callers should NOT await this unless they need the write to
 * land before responding — see the fire-and-forget note above.
 */
export async function recordFunnelEvent(
  stage: FunnelStage,
  userId: number | null | undefined,
  meta?: string,
): Promise<void> {
  // Guests have no reading limit and cannot subscribe, so they are not part of
  // the funnel being measured.
  if (!userId) return;

  try {
    const bucket = bucketFor(stage, new Date());
    await prisma.funnelEvent.upsert({
      where: { event_userId_bucket: { event: stage, userId, bucket } },
      create: { event: stage, userId, bucket, meta: meta ?? null },
      // Already recorded in this window — leave the original timestamp alone so
      // "when did they first hit this" stays answerable.
      update: {},
    });
  } catch (err) {
    // Swallow deliberately. Instrumentation is never worth breaking a request
    // over, and a missing data point is cheaper than a failed checkout.
    console.error('[funnel] failed to record', stage, err);
  }
}

export interface FunnelStageSummary {
  stage: FunnelStage;
  label: string;
  /** Distinct users who reached this stage in the window. */
  users: number;
  /** Percentage of the FIRST stage that reached this one. */
  ofTop: number | null;
  /** Percentage of the PREVIOUS stage that reached this one — the drop-off. */
  ofPrevious: number | null;
}

/**
 * getFunnelSummary — distinct users per stage over the last `days` days.
 *
 * Counts DISTINCT USERS, not events. Someone who opens the pricing page on five
 * separate days is one person considering it, not five.
 */
export async function getFunnelSummary(days = 30): Promise<{
  since: Date;
  stages: FunnelStageSummary[];
}> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const grouped = await prisma.funnelEvent.groupBy({
    by: ['event', 'userId'],
    where: { createdAt: { gte: since } },
  });

  // groupBy on (event, userId) gives one row per user per stage, so counting
  // rows per stage is already a distinct-user count.
  const counts = new Map<string, number>();
  for (const row of grouped) {
    counts.set(row.event, (counts.get(row.event) ?? 0) + 1);
  }

  const top = counts.get(FUNNEL_STAGES[0]) ?? 0;

  const stages: FunnelStageSummary[] = FUNNEL_STAGES.map((stage, i) => {
    const users = counts.get(stage) ?? 0;
    const prev = i === 0 ? null : counts.get(FUNNEL_STAGES[i - 1]) ?? 0;

    return {
      stage,
      label: STAGE_LABELS[stage],
      users,
      // Null rather than 0 when there is no denominator — "0%" would imply
      // total failure where the truth is "nothing to measure yet".
      ofTop: top > 0 ? Math.round((users / top) * 1000) / 10 : null,
      ofPrevious: prev && prev > 0 ? Math.round((users / prev) * 1000) / 10 : null,
    };
  });

  return { since, stages };
}
