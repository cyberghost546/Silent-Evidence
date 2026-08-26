// lib/ageGate.ts
//
// Single source of truth for "which stories is this viewer old enough to see".
//
// WHY THIS EXISTS
// ---------------
// The AgeGroup → ContentRating mapping had been written out by hand in four
// separate places (/api/stories, /api/stories/for-you, lib/nextStory.ts and the
// search page). Four copies meant four chances to forget one — and three browse
// surfaces had in fact forgotten it entirely: /search, /category/[slug] and
// /tag/[slug] listed MATURE stories to every viewer regardless of age. The story
// page itself blocks them (see app/components/ui/AgeGate.tsx), so a minor could
// not open one, but the title, excerpt and cover image were still on screen.
//
// Anything that lists stories should call `viewerRatings()` and spread the
// result into its `where` clause. Do not re-derive the mapping locally.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { AgeGroup, ContentRating } from '@prisma/client';

/**
 * Ratings each age group may see.
 * Typed against the Prisma enums so a rating or group that does not exist in the
 * schema is a compile error here rather than a filter that silently matches
 * nothing at runtime.
 */
export const ALLOWED_RATINGS: Record<AgeGroup, ContentRating[]> = {
  UNDER_13: ['ALL'],
  TEEN:     ['ALL', 'TEEN'],
  ADULT:    ['ALL', 'TEEN', 'MATURE'],
};

/** Ratings visible to a signed-out visitor. */
export const GUEST_RATINGS: ContentRating[] = ALLOWED_RATINGS.ADULT;

/** Maps an age group to its ratings, defaulting to the guest view. */
export function ratingsFor(ageGroup: string | null | undefined): ContentRating[] {
  return ALLOWED_RATINGS[ageGroup as AgeGroup] ?? GUEST_RATINGS;
}

/**
 * Reads the current viewer's age group from their session and returns the
 * content ratings they are allowed to see.
 *
 * Guests get the unrestricted list, which is what the rest of the site already
 * does: age is only known once someone tells us, and /verify-age plus the
 * per-story AgeGate component handle the signed-out case at read time.
 */
export async function viewerRatings(): Promise<ContentRating[]> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) return GUEST_RATINGS;

  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { ageGroup: true },
  });

  return ratingsFor(viewer?.ageGroup);
}

/**
 * Ready-made Prisma filter fragment. Spread it into a `where` clause:
 *
 *   where: { status: 'PUBLISHED', ...ratingFilter(ratings) }
 */
export function ratingFilter(ratings: ContentRating[]) {
  return { contentRating: { in: ratings } };
}
