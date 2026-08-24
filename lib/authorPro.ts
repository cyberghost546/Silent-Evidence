// lib/authorPro.ts
// Single source of truth for "may this user use the Author Pro tools?".
//
// Author Pro is the paid plan for WRITERS. It is a different product from the
// reader membership in lib/premiumCheck.ts, and the two are independent: a user
// may hold both, either, or neither. Never check one when you mean the other —
// a paying reader has not paid to sell stories, and a paying author has not paid
// to read other people's premium work.
//
// What Author Pro unlocks (each enforced server-side):
//   - Charging for stories (Story.price) and building bundles
//   - Premium-only stories (Story.isPremiumOnly)
//   - Early access windows (Story.earlyAccessUntil)
//   - Rich media: audio narration, video, Spotify soundtrack
//   - Advanced analytics on the dashboard

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { forbidden, unauthorized } from '@/lib/apiError';

// Stripe statuses that count as a live, paid-up subscription.
// "canceled" is absent on purpose: a cancelled plan keeps working until the
// webhook flips it, and currentPeriodEnd is what governs the grace period.
const LIVE_STATUSES = ['active', 'trialing'];

/**
 * hasAuthorPro — true when the user may use the Author Pro toolset:
 *   - ADMIN role (admins always have everything), OR
 *   - authorGrandfathered (was already using these features before the paywall), OR
 *   - a live Author Pro subscription
 */
export async function hasAuthorPro(userId: number | null): Promise<boolean> {
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      role: true,
      authorGrandfathered: true,
      authorSubscription: { select: { status: true } },
    },
  });
  if (!user) return false;

  if (user.role === 'ADMIN') return true;
  if (user.authorGrandfathered) return true;
  return LIVE_STATUSES.includes(user.authorSubscription?.status ?? '');
}

/**
 * getAuthorProContext — convenience wrapper for server components.
 * Reads the userId cookie and resolves Author Pro status in one call.
 */
export async function getAuthorProContext(): Promise<{
  userId: number | null;
  isAuthorPro: boolean;
}> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  const isAuthorPro = await hasAuthorPro(userId);
  return { userId, isAuthorPro };
}

/**
 * requireAuthorPro — guard for API route handlers.
 * Returns null when the caller may proceed, or a ready-to-return error response.
 *
 *   const denied = await requireAuthorPro();
 *   if (denied) return denied;
 */
export async function requireAuthorPro(
  message = 'This is an Author Pro feature. Upgrade at /author-pro to use it.',
) {
  const { userId, isAuthorPro } = await getAuthorProContext();
  if (!userId) return unauthorized();
  if (!isAuthorPro) return forbidden(message);
  return null;
}

// ── Field-level enforcement ──────────────────────────────────────────────────

// The Story fields that only an Author Pro member may set. Keeping the list here
// (rather than spelling it out in each route) means the create and update paths
// can never drift apart and quietly leave one field ungated.
export const AUTHOR_PRO_STORY_FIELDS = [
  'price',
  'isPremiumOnly',
  'earlyAccessUntil',
  'audioUrl',
  'videoUrl',
  'spotifyPlaylistUrl',
] as const;

export type AuthorProStoryField = (typeof AUTHOR_PRO_STORY_FIELDS)[number];

/**
 * usedAuthorProFields — which gated fields does this payload actually try to set
 * to a meaningful value?
 *
 * Only "turning a feature ON" counts. Clearing a field (null, '', false, 0) is
 * always allowed, so an author whose subscription lapsed can still remove a
 * price or unpublish an early-access window rather than being trapped with
 * settings they can no longer edit.
 */
export function usedAuthorProFields(
  payload: Record<string, unknown>,
): AuthorProStoryField[] {
  return AUTHOR_PRO_STORY_FIELDS.filter((field) => {
    const value = payload[field];
    if (value === undefined || value === null) return false;
    if (value === false) return false;
    if (value === 0) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  });
}

/**
 * enforceAuthorProFields — strips gated fields from a payload unless the user
 * has Author Pro, and reports which ones were removed.
 *
 * Returns the payload to actually write, plus the list of rejected fields so the
 * route can decide whether to fail loudly (a create/update the author explicitly
 * asked for) or carry on silently.
 */
export async function enforceAuthorProFields<T extends Record<string, unknown>>(
  userId: number | null,
  payload: T,
): Promise<{ data: T; rejected: AuthorProStoryField[] }> {
  const attempted = usedAuthorProFields(payload);
  if (attempted.length === 0) return { data: payload, rejected: [] };

  if (await hasAuthorPro(userId)) return { data: payload, rejected: [] };

  const data = { ...payload };
  for (const field of attempted) delete data[field];
  return { data, rejected: attempted };
}

/** Human-readable names for the gated fields, used in error messages. */
export const AUTHOR_PRO_FIELD_LABELS: Record<AuthorProStoryField, string> = {
  price:              'charging for a story',
  isPremiumOnly:      'premium-only stories',
  earlyAccessUntil:   'early access windows',
  audioUrl:           'audio narration',
  videoUrl:           'video attachments',
  spotifyPlaylistUrl: 'Spotify soundtracks',
};
