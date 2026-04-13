// lib/readingLimit.ts
// Free tier reading limits — non-premium users can read up to FREE_MONTHLY_LIMIT
// stories per calendar month. After that, they see a paywall prompt.
//
// How it works:
//   1. When a user opens a story, the story page calls checkReadingLimit()
//   2. We count distinct stories in their ReadingHistory for the current month
//   3. If they've hit the limit and don't have an active subscription, we return blocked=true
//   4. The frontend shows a premium upsell modal instead of the story content
//
// Premium subscribers and story authors bypass the limit entirely.
// Guest users (not logged in) get the same limit tracked by the stories they can view.

import { prisma } from './prisma';

// Maximum free stories per calendar month — tune this based on engagement data
export const FREE_MONTHLY_LIMIT = 10;

interface ReadingLimitResult {
  // true = user has exceeded their free tier and must upgrade
  blocked: boolean;
  // How many stories they've read this month
  readThisMonth: number;
  // How many free reads remain (0 if blocked)
  remaining: number;
  // Whether the user has an active premium subscription
  isPremium: boolean;
}

/**
 * checkReadingLimit — call before displaying a story's full content.
 * Returns whether the user is blocked by the free tier limit.
 *
 * @param userId    - The logged-in user's ID (null for guests)
 * @param storyId   - The story being read (authors always see their own stories)
 */
export async function checkReadingLimit(
  userId: number | null,
  storyId: number
): Promise<ReadingLimitResult> {
  // Guests who aren't logged in — can't track reading, allow them to read
  // (they'll be prompted to sign up for a better experience instead)
  if (!userId) {
    return { blocked: false, readThisMonth: 0, remaining: FREE_MONTHLY_LIMIT, isPremium: false };
  }

  // Check if user has an active premium subscription — premium users have no limit
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  const isPremium = subscription?.status === 'active' || subscription?.status === 'trialing';

  if (isPremium) {
    return { blocked: false, readThisMonth: 0, remaining: Infinity, isPremium: true };
  }

  // Check if the user is the author of this story — authors always see their own work
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true },
  });
  if (story?.authorId === userId) {
    return { blocked: false, readThisMonth: 0, remaining: FREE_MONTHLY_LIMIT, isPremium: false };
  }

  // Count distinct stories read this calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const readThisMonth = await prisma.readingHistory.count({
    where: {
      userId,
      readAt: { gte: monthStart },
    },
  });

  const remaining = Math.max(0, FREE_MONTHLY_LIMIT - readThisMonth);
  const blocked = readThisMonth >= FREE_MONTHLY_LIMIT;

  return { blocked, readThisMonth, remaining, isPremium };
}
