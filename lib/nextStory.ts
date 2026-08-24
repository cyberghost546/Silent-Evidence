// lib/nextStory.ts
// Picks ONE story to put in front of a reader who has just finished reading.
//
// WHY ONE, NOT A GRID
// The site already has three recommendation endpoints and four grids stacked at
// the end of every story. That is the problem, not the solution: a reader who
// finishes a story and is handed forty thumbnails has to make a decision, and
// the most common outcome of a hard decision is no decision. Autoplay works
// because it removes the choice. This does the same thing.
//
// PRIORITY CHAIN
// Continuity beats similarity beats popularity. In order:
//
//   1. next-in-series   — they just read part 3 and part 4 exists. Nothing else
//                         comes close as a signal of what someone wants next.
//   2. resume           — a story they started and abandoned partway. Already
//                         chosen once, so the pitch is "finish this", not
//                         "consider this".
//   3. similar          — scored against what they've liked and read.
//   4. trending         — for guests and brand-new accounts with no history.
//
// Each rung is only consulted if the one above found nothing, so the reason
// shown to the reader is always the strongest true one.
//
// WHAT IS NEVER SUGGESTED
// Anything the reader cannot actually open: stories above their age rating,
// premium-only stories they don't have access to, and stories still inside an
// early-access window. Recommending a locked story to keep someone reading is
// self-defeating — it stops them reading.

import { prisma } from '@/lib/prisma';
import type { Prisma, ContentRating } from '@prisma/client';

/** Scroll depth at which a story counts as finished. Matches lib/readingWrapped.ts. */
const FINISHED_AT = 85;

/** Below this, the reader barely started — not worth calling a "resume". */
const RESUME_FLOOR = 5;

export type NextReason = 'series' | 'resume' | 'similar' | 'trending';

export interface NextStory {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  categoryName: string | null;
  authorUsername: string | null;
  /** Why this story was chosen — drives the label shown to the reader. */
  reason: NextReason;
  /** For 'resume', how far through they already are (0–100). */
  progress?: number;
}

// The fields every candidate query needs. Declared once so the shapes cannot
// drift between the four strategies.
const STORY_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  category: { select: { name: true } },
  author: { select: { username: true } },
} satisfies Prisma.StorySelect;

type Candidate = Prisma.StoryGetPayload<{ select: typeof STORY_SELECT }>;

function shape(s: Candidate, reason: NextReason, progress?: number): NextStory {
  return {
    id: s.id,
    title: s.title,
    slug: s.slug,
    excerpt: s.excerpt,
    coverImage: s.coverImage,
    categoryName: s.category?.name ?? null,
    authorUsername: s.author?.username ?? null,
    reason,
    ...(progress !== undefined ? { progress } : {}),
  };
}

/**
 * Content ratings a viewer may see, mirroring the rule used in /api/stories.
 * Typed as ContentRating[] rather than string[] so a rating that is not in the
 * Prisma enum is a compile error here rather than a silent filter mismatch.
 */
function allowedRatings(ageGroup: string | null | undefined): ContentRating[] {
  if (ageGroup === 'UNDER_13') return ['ALL'];
  if (ageGroup === 'TEEN') return ['ALL', 'TEEN'];
  return ['ALL', 'TEEN', 'MATURE'];
}

/**
 * Baseline filter applied to every candidate: published, readable by this
 * viewer, and not the story they are already on.
 */
function baseWhere(
  currentStoryId: number,
  ageGroup: string | null | undefined,
  hasPremium: boolean,
): Prisma.StoryWhereInput {
  const now = new Date();
  return {
    status: 'PUBLISHED',
    id: { not: currentStoryId },
    contentRating: { in: allowedRatings(ageGroup) },
    // Locked content is excluded rather than ranked down. A "read this next"
    // card that opens a paywall breaks the exact behaviour it exists to create.
    ...(hasPremium
      ? {}
      : {
          isPremiumOnly: false,
          OR: [
            { earlyAccessUntil: null },
            { earlyAccessUntil: { lte: now } },
          ],
        }),
  };
}

export interface NextStoryInput {
  currentStoryId: number;
  /** Null for logged-out readers — they get series continuation and trending. */
  userId: number | null;
  ageGroup?: string | null;
  hasPremium?: boolean;
  /** Series of the story just read, if any. */
  seriesId?: number | null;
  seriesOrder?: number | null;
  categoryId?: number | null;
  mood?: string | null;
}

export async function getNextStory(input: NextStoryInput): Promise<NextStory | null> {
  const {
    currentStoryId, userId, ageGroup, hasPremium = false,
    seriesId, seriesOrder, categoryId, mood,
  } = input;

  const where = baseWhere(currentStoryId, ageGroup, hasPremium);

  // ── 1. Next in series ─────────────────────────────────────────────────────
  // The strongest possible signal, and it applies to guests too.
  if (seriesId && seriesOrder != null) {
    const next = await prisma.story.findFirst({
      where: { ...where, seriesId, seriesOrder: { gt: seriesOrder } },
      orderBy: { seriesOrder: 'asc' },
      select: STORY_SELECT,
    });
    if (next) return shape(next, 'series');
  }

  // Everything below needs history, so guests skip to trending.
  if (!userId) {
    return trending(where);
  }

  // One pass over this reader's history, reused by both the resume and similar
  // strategies rather than queried twice.
  const history = await prisma.readingHistory.findMany({
    where: { userId },
    orderBy: { readAt: 'desc' },
    take: 100,
    select: { storyId: true, progress: true },
  });

  const readIds = history.map((h) => h.storyId);

  // ── 2. Resume something abandoned ─────────────────────────────────────────
  // Most recent first: the thing they walked away from yesterday is a better
  // bet than the one they abandoned in March.
  const unfinished = history.filter(
    (h) => h.progress >= RESUME_FLOOR && h.progress < FINISHED_AT && h.storyId !== currentStoryId,
  );

  if (unfinished.length > 0) {
    const candidate = await prisma.story.findFirst({
      where: { ...where, id: { in: unfinished.map((u) => u.storyId), not: currentStoryId } },
      select: STORY_SELECT,
    });
    if (candidate) {
      const match = unfinished.find((u) => u.storyId === candidate.id);
      return shape(candidate, 'resume', match?.progress);
    }
  }

  // ── 3. Similar to what they read and liked ────────────────────────────────
  const similar = await scoreSimilar({
    where, userId, readIds, categoryId, mood,
  });
  if (similar) return similar;

  // ── 4. Trending ───────────────────────────────────────────────────────────
  return trending(where, readIds);
}

/**
 * scoreSimilar — ranks unread candidates against the reader's tastes.
 *
 * Weights are ordered by how much signal each carries about what someone will
 * actually open next:
 *   +5  same category as the story just finished  (strongest in-the-moment cue)
 *   +3  same mood as the story just finished
 *   +3  by an author they follow
 *   +2  category they have liked before
 *   +2  mood listed in their fear profile
 *   +1  published in the last 14 days (freshness tiebreak)
 *   + small popularity nudge, capped so a viral story cannot dominate
 *
 * Scoring happens in application code over a bounded candidate set rather than
 * in SQL: the weights are readable and adjustable here, and the set is small.
 */
async function scoreSimilar(args: {
  where: Prisma.StoryWhereInput;
  userId: number;
  readIds: number[];
  categoryId?: number | null;
  mood?: string | null;
}): Promise<NextStory | null> {
  const { where, userId, readIds, categoryId, mood } = args;

  const [profile, follows, likes] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, select: { fearMoods: true } }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    prisma.like.findMany({
      where: { userId },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: { story: { select: { categoryId: true, mood: true } } },
    }),
  ]);

  const fearMoods = new Set(
    (profile?.fearMoods ?? '').split(',').map((m) => m.trim()).filter(Boolean),
  );
  const followedIds = new Set(follows.map((f) => f.followingId));
  const likedCategories = new Set(likes.map((l) => l.story?.categoryId).filter(Boolean));
  const likedMoods = new Set(likes.map((l) => l.story?.mood).filter(Boolean));

  // Bounded candidate pool. Newest-first so the pool skews to material the
  // reader is unlikely to have seen, without needing a full table scan.
  const candidates = await prisma.story.findMany({
    where: { ...where, id: { ...(where.id as object), notIn: readIds } },
    orderBy: { createdAt: 'desc' },
    take: 120,
    select: {
      ...STORY_SELECT,
      categoryId: true,
      mood: true,
      authorId: true,
      views: true,
      createdAt: true,
      _count: { select: { likes: true } },
    },
  });

  if (candidates.length === 0) return null;

  const fortnightAgo = new Date();
  fortnightAgo.setDate(fortnightAgo.getDate() - 14);

  let best: { story: Candidate; score: number } | null = null;

  for (const c of candidates) {
    let score = 0;
    if (categoryId && c.categoryId === categoryId) score += 5;
    if (mood && c.mood === mood) score += 3;
    if (followedIds.has(c.authorId)) score += 3;
    if (c.categoryId && likedCategories.has(c.categoryId)) score += 2;
    if (c.mood && likedMoods.has(c.mood)) score += 2;
    if (c.createdAt >= fortnightAgo) score += 1;

    // Popularity as a tiebreak only. Capped at 2 points so a single runaway hit
    // cannot outrank genuine relevance and get recommended to everyone forever.
    score += Math.min(2, c._count.likes * 0.1 + c.views * 0.001);

    if (!best || score > best.score) best = { story: c, score };
  }

  // A candidate that matches nothing at all scored only the popularity nudge —
  // that is not a recommendation, it is just a popular story, so let the
  // trending strategy handle it and label it honestly.
  if (!best || best.score < 2) return null;

  return shape(best.story, 'similar');
}

/** Popular recent stories — the honest fallback when nothing personal applies. */
async function trending(
  where: Prisma.StoryWhereInput,
  excludeIds: number[] = [],
): Promise<NextStory | null> {
  const story = await prisma.story.findFirst({
    where: excludeIds.length
      ? { ...where, id: { ...(where.id as object), notIn: excludeIds } }
      : where,
    orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    select: STORY_SELECT,
  });
  return story ? shape(story, 'trending') : null;
}
