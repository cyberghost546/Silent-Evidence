// lib/readingWrapped.ts
// Builds a reader's personal "Year in Horror" recap.
//
// WHY THIS IS THE PAID FEATURE
// Everything here is derived from data the site already collects while someone
// simply uses it — ReadingHistory, ScareRating, ReadingStreak, Like, Bookmark.
// No new tracking was added.
//
// That property is what makes it worth paying for. Unlike a perk that is equally
// good on day one and day four hundred, a recap gets richer the longer someone
// stays, and it is worth nothing to a brand-new account. It rewards exactly the
// behaviour the business wants (keep reading, keep the subscription) and it is
// the kind of thing people screenshot and share, which costs nothing to
// distribute.

import { prisma } from '@/lib/prisma';
import { moodMeta } from '@/lib/moods';

export interface WrappedStat {
  label: string;
  value: string;
  /** Optional supporting line shown under the value. */
  detail?: string;
}

export interface WrappedData {
  year: number;
  /** True when the reader has essentially no activity to summarise. */
  empty: boolean;

  storiesRead: number;
  storiesFinished: number;
  /** Percentage of opened stories read to (near) the end. */
  finishRate: number | null;
  wordsRead: number;
  minutesRead: number;

  longestStreak: number;
  currentStreak: number;

  likesGiven: number;
  bookmarksSaved: number;

  /** The reader's most-read category, if they have a clear favourite. */
  topCategory: { name: string; slug: string; count: number } | null;
  /** Their signature mood, with presentation metadata for the card. */
  topMood: { value: string; label: string; color: string; count: number } | null;
  /** The author whose work they read most. */
  topAuthor: { username: string; count: number } | null;

  /** Average scare rating they gave, 1–5. */
  averageScare: number | null;
  /** The single scariest story they rated, if any. */
  scariest: { title: string; slug: string; rating: number } | null;

  /** Busiest reading month, e.g. "October". */
  peakMonth: { name: string; count: number } | null;
  /** Reads per month, Jan–Dec, for the bar chart. */
  byMonth: number[];

  /** The first story they opened this year — the bookend. */
  firstStory: { title: string; slug: string; readAt: Date } | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// A story counts as "finished" at 85% scroll depth rather than 100. Readers
// rarely scroll through trailing comment sections and footers, so demanding 100
// would report almost nobody as finishing anything.
const FINISHED_AT = 85;

// Used to convert word counts into reading minutes. Matches the site's own
// reading-time convention.
const WORDS_PER_MINUTE = 200;

/** Strips HTML tags and counts words — story content is stored as HTML. */
function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

/** Returns the single most frequent key in a tally, or null on a tie-less empty set. */
function topOf<T>(tally: Map<string, { count: number; payload: T }>) {
  let best: { key: string; count: number; payload: T } | null = null;
  for (const [key, { count, payload }] of tally) {
    if (!best || count > best.count) best = { key, count, payload };
  }
  return best;
}

export async function getReadingWrapped(
  userId: number,
  year: number = new Date().getFullYear(),
): Promise<WrappedData> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  // One pass over the year's reading history, joined to everything the cards
  // need. `progress` comes from ScrollDepthTracker and drives the finish rate.
  const [history, streak, likesGiven, bookmarksSaved, ratings] = await Promise.all([
    prisma.readingHistory.findMany({
      where: { userId, readAt: { gte: start, lt: end } },
      orderBy: { readAt: 'asc' },
      select: {
        readAt: true,
        progress: true,
        story: {
          select: {
            title: true,
            slug: true,
            content: true,
            mood: true,
            category: { select: { name: true, slug: true } },
            author: { select: { username: true } },
          },
        },
      },
    }),
    prisma.readingStreak.findUnique({
      where: { userId },
      select: { currentStreak: true, longestStreak: true },
    }),
    prisma.like.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
    prisma.bookmark.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
    prisma.scareRating.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { rating: true, story: { select: { title: true, slug: true } } },
      orderBy: { rating: 'desc' },
    }),
  ]);

  const categories = new Map<string, { count: number; payload: { name: string; slug: string } }>();
  const moods = new Map<string, { count: number; payload: null }>();
  const authors = new Map<string, { count: number; payload: null }>();
  const byMonth = new Array(12).fill(0);

  let storiesFinished = 0;
  let wordsRead = 0;

  for (const h of history) {
    byMonth[new Date(h.readAt).getMonth()]++;

    if (h.progress >= FINISHED_AT) storiesFinished++;

    // Only count words for stories actually read through — crediting a reader
    // with 4,000 words for a story they bounced off after two lines would make
    // the headline number meaningless.
    if (h.progress >= FINISHED_AT) wordsRead += countWords(h.story.content);

    const cat = h.story.category;
    if (cat) {
      const entry = categories.get(cat.slug) ?? { count: 0, payload: cat };
      entry.count++;
      categories.set(cat.slug, entry);
    }

    if (h.story.mood) {
      const entry = moods.get(h.story.mood) ?? { count: 0, payload: null };
      entry.count++;
      moods.set(h.story.mood, entry);
    }

    const uname = h.story.author?.username;
    if (uname) {
      const entry = authors.get(uname) ?? { count: 0, payload: null };
      entry.count++;
      authors.set(uname, entry);
    }
  }

  const topCat = topOf(categories);
  const topMoodEntry = topOf(moods);
  const topAuthorEntry = topOf(authors);

  const peakIndex = byMonth.reduce(
    (bestIdx, count, i, arr) => (count > arr[bestIdx] ? i : bestIdx),
    0,
  );

  const averageScare = ratings.length
    ? Math.round((ratings.reduce((n, r) => n + r.rating, 0) / ratings.length) * 10) / 10
    : null;

  const moodInfo = topMoodEntry ? moodMeta(topMoodEntry.key) : null;

  return {
    year,
    // A recap of nothing is worse than no recap — the page uses this to show an
    // encouraging empty state instead of a wall of zeroes.
    empty: history.length === 0,

    storiesRead: history.length,
    storiesFinished,
    finishRate: history.length
      ? Math.round((storiesFinished / history.length) * 100)
      : null,
    wordsRead,
    minutesRead: Math.round(wordsRead / WORDS_PER_MINUTE),

    longestStreak: streak?.longestStreak ?? 0,
    currentStreak: streak?.currentStreak ?? 0,

    likesGiven,
    bookmarksSaved,

    topCategory: topCat
      ? { name: topCat.payload.name, slug: topCat.payload.slug, count: topCat.count }
      : null,
    topMood: topMoodEntry && moodInfo
      ? {
          value: topMoodEntry.key,
          label: moodInfo.label,
          color: moodInfo.color,
          count: topMoodEntry.count,
        }
      : null,
    topAuthor: topAuthorEntry
      ? { username: topAuthorEntry.key, count: topAuthorEntry.count }
      : null,

    averageScare,
    scariest: ratings.length
      ? {
          title: ratings[0].story.title,
          slug: ratings[0].story.slug,
          rating: ratings[0].rating,
        }
      : null,

    peakMonth: byMonth[peakIndex] > 0
      ? { name: MONTH_NAMES[peakIndex], count: byMonth[peakIndex] }
      : null,
    byMonth,

    firstStory: history.length
      ? {
          title: history[0].story.title,
          slug: history[0].story.slug,
          readAt: history[0].readAt,
        }
      : null,
  };
}
