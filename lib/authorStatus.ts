// lib/authorStatus.ts
// Author status is earned, not assigned.
//
// WHAT CHANGED AND WHY
// The Role enum has always had an AUTHOR value, but it gated nothing: /write
// never checked it, and it was only ever set by hand from the admin user list.
// Anyone who signed up could already publish. So "author" was a label a human
// had to remember to apply, which meant in practice nobody got it.
//
// Now it is a milestone. Everyone starts as a USER and is promoted the moment
// their published work passes a read threshold. That makes the role mean
// something — it says "people actually read this person" — without taking
// anything away, because writing was never gated on it in the first place.
//
// WHAT THE METRIC IS
// Total views across the user's PUBLISHED stories. Not distinct logged-in
// readers: ReadingHistory only records signed-in users, so on a public site it
// would ignore most of the audience and the number would look absurdly low next
// to the view count already shown on every story. Views are deduplicated per IP
// per hour by the story page, so this is closer to "reads" than to raw hits —
// which is why the UI says reads rather than readers.
//
// PROMOTION IS ONE-WAY
// Nobody is ever demoted. Views can only go up, but a story being deleted or
// unpublished could drop the total, and yo-yoing someone's status is worse than
// letting an earned title stand.

import { prisma } from '@/lib/prisma';

/**
 * Reads required to become an author.
 *
 * Configurable so the bar can be tuned without a deploy — a threshold that is
 * right for a site with a thousand readers is wrong for one with a million.
 * A malformed value falls back to the default rather than accidentally
 * promoting everyone (0) or nobody (NaN).
 *
 * Set as the DEFAULT rather than only in .env because .env is gitignored: an
 * env-only value would apply locally and leave production silently on whatever
 * this constant says. AUTHOR_PROMOTION_READS still overrides it per environment.
 */
const DEFAULT_THRESHOLD = 500;

function resolveThreshold(): number {
  const raw = process.env.AUTHOR_PROMOTION_READS;
  if (!raw) return DEFAULT_THRESHOLD;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.warn(
      `[authorStatus] AUTHOR_PROMOTION_READS="${raw}" is not a positive integer — using ${DEFAULT_THRESHOLD}.`
    );
    return DEFAULT_THRESHOLD;
  }
  return parsed;
}

export const AUTHOR_THRESHOLD = resolveThreshold();

/** Badge awarded on promotion. UserBadge.type is a String, so no migration. */
export const AUTHOR_BADGE = 'AUTHOR_STATUS';

export interface AuthorProgress {
  /** Total reads across published stories. */
  reads: number;
  threshold: number;
  /** Reads still needed. 0 once the threshold is met. */
  remaining: number;
  /** 0–100, capped, for a progress bar. */
  percent: number;
  /** Whether this user already holds author status (or outranks it). */
  isAuthor: boolean;
}

/**
 * getAuthorProgress — how close a user is to earning author status.
 *
 * Read-only. Safe to call from any page that wants to show the progress bar.
 */
export async function getAuthorProgress(userId: number): Promise<AuthorProgress> {
  const [user, agg] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.story.aggregate({
      where: { authorId: userId, status: 'PUBLISHED' },
      _sum: { views: true },
    }),
  ]);

  const reads = agg._sum.views ?? 0;

  // ADMIN counts as already having it — an admin being shown "2% of the way to
  // author" would be nonsense.
  const isAuthor = user?.role === 'AUTHOR' || user?.role === 'ADMIN';

  return {
    reads,
    threshold: AUTHOR_THRESHOLD,
    remaining: Math.max(0, AUTHOR_THRESHOLD - reads),
    percent: Math.min(100, Math.round((reads / AUTHOR_THRESHOLD) * 100)),
    isAuthor,
  };
}

/**
 * maybePromoteToAuthor — promote a user who has crossed the threshold.
 *
 * `totalReads` is passed in rather than queried because the only caller
 * (checkAndAwardBadges) has already computed it. Re-querying would double the
 * cost of a function that runs on every publish, like, and comment.
 *
 * Returns true only when a promotion actually happened this call, so the caller
 * can tell "was promoted" apart from "already was".
 *
 * Never throws — a failure here must not break publishing.
 */
export async function maybePromoteToAuthor(
  userId: number,
  totalReads: number,
): Promise<boolean> {
  if (totalReads < AUTHOR_THRESHOLD) return false;

  try {
    // updateMany with the role in the WHERE clause makes this atomic and
    // idempotent: two concurrent calls cannot both promote, and an ADMIN can
    // never be silently downgraded to AUTHOR by this code.
    const { count } = await prisma.user.updateMany({
      where: { id: userId, role: { in: ['USER', 'GUEST'] } },
      data: { role: 'AUTHOR' },
    });

    // count === 0 means they were already AUTHOR or ADMIN — nothing to announce.
    if (count === 0) return false;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // Tell them. A status change nobody is told about may as well not have
    // happened — the notification is the feature, the role flag is plumbing.
    await Promise.all([
      prisma.notification.create({
        data: {
          userId,
          type: 'MILESTONE',
          message:
            `You're now an Author. Your stories have been read ` +
            `${totalReads.toLocaleString()} times.`,
        },
      }),
      prisma.userBadge.upsert({
        where: { userId_type: { userId, type: AUTHOR_BADGE } },
        create: { userId, type: AUTHOR_BADGE },
        update: {},
      }),
    ]);

    console.warn(
      `[authorStatus] promoted ${user?.username ?? userId} to AUTHOR at ${totalReads} reads`
    );
    return true;
  } catch (err) {
    console.error('[authorStatus] promotion failed', err);
    return false;
  }
}
