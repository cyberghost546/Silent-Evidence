// lib/premiumCheck.ts
// Single source of truth for "is this user allowed premium features?".
//
// Every premium gate on the site should go through this file rather than
// querying the Subscription table directly, so there is exactly one definition
// of what counts as premium and one place to change it.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { forbidden, unauthorized } from '@/lib/apiError';

/**
 * hasPremiumAccess — returns true when the user should receive premium access:
 *   - active subscription   OR
 *   - ADMIN role (admins always see everything for free)
 */
export async function hasPremiumAccess(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true, subscription: { select: { status: true } } },
  });
  return user?.role === 'ADMIN' || user?.subscription?.status === 'active';
}

/**
 * getPremiumContext — convenience wrapper for server components.
 *
 * Reads the userId cookie and resolves premium status in one call, so pages
 * don't each repeat the cookie parsing. Returns userId as null for guests.
 *
 *   const { userId, hasPremium } = await getPremiumContext();
 */
export async function getPremiumContext(): Promise<{
  userId: number | null;
  hasPremium: boolean;
}> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  const hasPremium = await hasPremiumAccess(userId);
  return { userId, hasPremium };
}

/**
 * requirePremium — guard for API route handlers.
 *
 * Returns null when the caller may proceed, or a ready-to-return error response
 * (401 for logged out, 403 for logged in but not subscribed) when they may not.
 *
 *   const denied = await requirePremium();
 *   if (denied) return denied;
 */
export async function requirePremium(message = 'This feature is for premium members.') {
  const { userId, hasPremium } = await getPremiumContext();
  if (!userId) return unauthorized();
  if (!hasPremium) return forbidden(message);
  return null;
}

/**
 * isEarlyAccessLocked — true when a story is still inside its premium
 * early-access window and this viewer has not earned their way past it.
 *
 * The author of a story always sees their own work, and premium members are the
 * whole point of the window, so both bypass it. Everyone else waits until
 * earlyAccessUntil has passed.
 *
 * Pure function (no DB access) so it can be reused by any page that has already
 * loaded the story row.
 */
export function isEarlyAccessLocked(
  earlyAccessUntil: Date | string | null | undefined,
  hasPremium: boolean,
  isAuthor: boolean,
): boolean {
  if (!earlyAccessUntil) return false;
  if (hasPremium || isAuthor) return false;
  return new Date(earlyAccessUntil) > new Date();
}
