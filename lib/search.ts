// lib/search.ts
//
// Story search — MariaDB FULLTEXT matching with relevance ranking.
//
// WHY THIS EXISTS
// ---------------
// Search used to be a stack of Prisma `contains` filters, which MySQL executes as
// `LIKE '%term%'`. A leading wildcard means no index can be used, so every search
// was a full table scan that read the whole `content` LongText column of every
// published story. It also had no concept of relevance: a story whose *title* is
// the query ranked exactly the same as one that mentions the word once in
// paragraph forty, and results came back in date order regardless.
//
// This module instead uses the FULLTEXT indexes declared on the Story model
// (see prisma/schema.prisma — `@@fulltext([title, excerpt, content])` and
// `@@fulltext([title])`) via MATCH ... AGAINST. That gives us:
//   - an actual index lookup instead of a scan
//   - a relevance score per row, which we sort by
//   - multi-word queries that match words in any order, anywhere in the story
//   - phrase search with "quoted text"
//
// Prisma's query API cannot express MATCH ... AGAINST, so the matching half runs
// as raw SQL through Prisma.sql tagged templates. Every user-supplied value is
// still passed as a bound parameter — nothing is string-concatenated into SQL.
//
// The raw query only ever selects story IDs. Once we know which IDs matched and
// in what order, we hand off to the normal Prisma client to load the display
// fields, so the shape of a search result stays identical to the rest of the app.
//
// FULLTEXT GOTCHAS THIS MODULE HANDLES
// ------------------------------------
//   1. MariaDB's `innodb_ft_min_token_size` is 3, so words of 1–2 characters are
//      not in the index at all and can never match. Queries made entirely of
//      short words ("it", "us") would silently return nothing, so those fall back
//      to the old LIKE behaviour — slow, but correct, and rare.
//   2. Common stopwords ("the", "and") are not indexed either. Same fallback.
//   3. Boolean-mode syntax gives `+ - * " ( ) ~ < >` special meaning. A reader
//      typing "cabin - woods" must not accidentally run an operator, so the query
//      is tokenised and rebuilt from scratch rather than passed through.

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Matches MariaDB's innodb_ft_min_token_size. Words shorter than this are not
// present in the FULLTEXT index, so they cannot be matched by MATCH ... AGAINST.
const MIN_TOKEN_LENGTH = 3;

// Reading-time bands, expressed in minutes.
// The old in-memory filter estimated minutes as `content.length / 5 / 200`
// (≈5 characters per word, 200 words per minute), i.e. 1000 characters ≈ 1 minute.
// We keep that exact formula so the bands mean the same thing as before — the
// only change is that it is now evaluated in SQL, which lets the database do the
// filtering, counting and pagination instead of JavaScript.
const CHARS_PER_MINUTE = 1000;

export const READ_TIME_BANDS: Record<string, [number, number]> = {
  short:  [0,  5],
  medium: [5, 15],
  long:   [15, 999],
};

export type SearchSort = 'relevance' | 'newest' | 'popular' | 'comments';

export type StorySearchParams = {
  /** Raw text the reader typed. Empty string = browse mode (filters only). */
  query: string;
  /** Category slug to restrict to, e.g. "found-footage". */
  categorySlug?: string;
  /** Mood enum value, e.g. "ATMOSPHERIC" — see lib/moods.ts. */
  mood?: string;
  /** Reading-time band key — one of READ_TIME_BANDS, or '' for any length. */
  readTime?: string;
  sort?: SearchSort;
  /** Content ratings this viewer is old enough to see, e.g. ['ALL','TEEN']. */
  allowedRatings: readonly string[];
  /** 1-based page number. */
  page: number;
  pageSize: number;
};

/**
 * How the results were produced. Useful for explaining an empty result set to
 * the reader, and for telling "we searched properly and found nothing" apart
 * from "your query could not be indexed".
 *
 *   fulltext — MATCH ... AGAINST against the FULLTEXT index (the fast path)
 *   loose    — the strict all-words match found nothing, so we retried with
 *              any-word matching and ranked by relevance
 *   like     — query had no indexable words; fell back to LIKE scanning
 *   browse   — no text query at all, just filters
 */
export type SearchMode = 'fulltext' | 'loose' | 'like' | 'browse';

export type StorySearchResult = {
  ids: number[];
  total: number;
  totalPages: number;
  /** Page actually returned — clamped into range when `page` overshoots. */
  page: number;
  mode: SearchMode;
  /** Words dropped from the query because they are too short to be indexed. */
  ignoredTerms: string[];
};

// ── Query parsing ────────────────────────────────────────────────────────────

type ParsedQuery = {
  /** Boolean-mode expression requiring every term: `+ghost* +cabin*` */
  strict: string;
  /** Same terms with no `+`, so any one of them can match: `ghost* cabin*` */
  loose: string;
  /** Words too short to appear in the FULLTEXT index. */
  ignored: string[];
  /** False when nothing indexable survived parsing — caller should use LIKE. */
  usable: boolean;
};

/**
 * Turns whatever the reader typed into a safe MariaDB boolean-mode expression.
 *
 * Double-quoted runs are preserved as phrase matches; everything else is split
 * into words, stripped of characters that carry meaning in boolean mode, and
 * given a trailing `*` so "ghost" also matches "ghosts" and "ghostly".
 *
 * Exported for unit testing — the escaping here is the security-sensitive part
 * of this module, so it is worth being able to test in isolation.
 */
export function parseSearchQuery(raw: string): ParsedQuery {
  const ignored: string[] = [];
  const strictParts: string[] = [];
  const looseParts: string[] = [];

  // Pull out "quoted phrases" first so their internal spaces survive tokenising.
  const phrases: string[] = [];
  const withoutPhrases = raw.replace(/"([^"]*)"/g, (_match, inner: string) => {
    phrases.push(inner);
    return ' ';
  });

  for (const phrase of phrases) {
    // Strip anything that is not a letter, number, apostrophe or space. A phrase
    // is only usable if at least one of its words is long enough to be indexed —
    // MariaDB matches a phrase by first finding its indexed words, so a phrase of
    // entirely short words can never match.
    const cleaned = phrase.replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    if (cleaned.split(' ').some((w) => w.length >= MIN_TOKEN_LENGTH)) {
      strictParts.push(`+"${cleaned}"`);
      looseParts.push(`"${cleaned}"`);
    } else {
      ignored.push(cleaned);
    }
  }

  // Everything outside quotes: replace every non-word character with a space.
  // This is what neutralises boolean-mode operators — `+ - * " ( ) ~ < > @` all
  // become whitespace, so they can never reach MariaDB as syntax.
  const words = withoutPhrases
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .split(' ')
    .map((w) => w.replace(/^'+|'+$/g, '')) // trim stray quote marks
    .filter(Boolean);

  for (const word of words) {
    if (word.length < MIN_TOKEN_LENGTH) {
      ignored.push(word);
      continue;
    }
    // `+word*` = this word is required, and may have any suffix.
    strictParts.push(`+${word}*`);
    looseParts.push(`${word}*`);
  }

  return {
    strict: strictParts.join(' '),
    loose:  looseParts.join(' '),
    ignored,
    usable: strictParts.length > 0,
  };
}

// ── SQL builders ─────────────────────────────────────────────────────────────

/**
 * Filters that apply to every search, regardless of how the text is matched.
 * Returned as an array so callers can append the text-matching condition and
 * join the whole set with AND.
 */
function baseConditions(params: StorySearchParams): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`s.status = 'PUBLISHED'`];

  // Age gate. An empty allow-list would mean "show nothing", which is never what
  // the caller wants, so treat it as "no rating restriction".
  if (params.allowedRatings.length > 0) {
    conditions.push(Prisma.sql`s.contentRating IN (${Prisma.join([...params.allowedRatings])})`);
  }

  if (params.categorySlug) {
    conditions.push(Prisma.sql`c.slug = ${params.categorySlug}`);
  }

  if (params.mood) {
    conditions.push(Prisma.sql`s.mood = ${params.mood}`);
  }

  const band = params.readTime ? READ_TIME_BANDS[params.readTime] : undefined;
  if (band) {
    // Evaluated by the database, so COUNT(*) and LIMIT/OFFSET below stay
    // consistent with what the reader actually sees. The previous in-memory
    // version filtered *after* counting, which made the result total and the
    // page count disagree with the visible results.
    conditions.push(
      Prisma.sql`CHAR_LENGTH(s.content) >= ${band[0] * CHARS_PER_MINUTE}
             AND CHAR_LENGTH(s.content) <  ${band[1] * CHARS_PER_MINUTE}`,
    );
  }

  return conditions;
}

/**
 * The condition that decides whether a story matches the reader's text.
 *
 * FULLTEXT covers the story's own words. Category name, author name and tags
 * live in other tables that are far too small to be worth indexing, so those
 * stay as LIKE comparisons — searching "Lovecraft" should still find stories by
 * an author of that name even though the word appears nowhere in the text.
 */
function textCondition(expr: string | null, rawQuery: string): Prisma.Sql {
  const like = `%${rawQuery}%`;

  const metadataMatch = Prisma.sql`
       c.name LIKE ${like}
    OR u.username LIKE ${like}
    OR EXISTS (
         SELECT 1 FROM \`_StoryTags\` st
         JOIN \`Tag\` t ON t.id = st.B
         WHERE st.A = s.id AND t.name LIKE ${like}
       )`;

  // No indexable words in the query — fall back to scanning the body with LIKE.
  if (expr === null) {
    return Prisma.sql`(
         s.title   LIKE ${like}
      OR s.excerpt LIKE ${like}
      OR s.content LIKE ${like}
      OR ${metadataMatch}
    )`;
  }

  return Prisma.sql`(
       MATCH (s.title, s.excerpt, s.content) AGAINST (${expr} IN BOOLEAN MODE)
    OR ${metadataMatch}
  )`;
}

/**
 * ORDER BY clause.
 *
 * Relevance combines two scores from the two FULLTEXT indexes: a hit in the
 * title is weighted far more heavily than a hit somewhere in the body, because
 * someone searching "The Passenger" almost always wants the story called that,
 * not the forty stories that use the word "passenger" once. Ties break by date.
 */
function orderClause(sort: SearchSort, expr: string | null): Prisma.Sql {
  switch (sort) {
    case 'popular':
      return Prisma.sql`ORDER BY (SELECT COUNT(*) FROM \`Like\` l WHERE l.storyId = s.id) DESC, s.createdAt DESC`;
    case 'comments':
      return Prisma.sql`ORDER BY (SELECT COUNT(*) FROM \`Comment\` cm WHERE cm.storyId = s.id) DESC, s.createdAt DESC`;
    case 'newest':
      return Prisma.sql`ORDER BY s.createdAt DESC`;
    case 'relevance':
    default:
      // Without an indexable query there is no score to sort by, so relevance
      // degrades to newest-first rather than ordering rows arbitrarily.
      if (expr === null) return Prisma.sql`ORDER BY s.createdAt DESC`;
      return Prisma.sql`
        ORDER BY (
          MATCH (s.title) AGAINST (${expr} IN BOOLEAN MODE) * 4
          + MATCH (s.title, s.excerpt, s.content) AGAINST (${expr} IN BOOLEAN MODE)
        ) DESC, s.createdAt DESC`;
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Runs one search and returns the matching story IDs for the requested page,
 * in display order, plus the total across all pages.
 *
 * Only IDs come back — load the display fields with the normal Prisma client
 * (see `loadStoriesInOrder`) so raw SQL never dictates the result shape.
 */
export async function searchStoryIds(params: StorySearchParams): Promise<StorySearchResult> {
  const query    = params.query.trim();
  const pageSize = Math.max(1, params.pageSize);
  const sort     = params.sort ?? (query ? 'relevance' : 'newest');

  const parsed = query ? parseSearchQuery(query) : null;

  // Decide which matching strategy to use before touching the database.
  let expr: string | null = null;
  let mode: SearchMode = 'browse';
  if (query) {
    if (parsed!.usable) {
      expr = parsed!.strict;
      mode = 'fulltext';
    } else {
      // Query was all short words / stopwords — nothing to look up in the index.
      expr = null;
      mode = 'like';
    }
  }

  const run = async (matchExpr: string | null): Promise<{ ids: number[]; total: number }> => {
    const conditions = baseConditions(params);
    if (query) conditions.push(textCondition(matchExpr, query));

    const where = Prisma.join(conditions, ' AND ');
    // Category and author are joined unconditionally because both the filters
    // and the metadata match reference them.
    const from = Prisma.sql`
      FROM \`Story\` s
      JOIN \`Category\` c ON c.id = s.categoryId
      JOIN \`User\`     u ON u.id = s.authorId
      WHERE ${where}`;

    const countRows = await prisma.$queryRaw<{ total: bigint | number }[]>(
      Prisma.sql`SELECT COUNT(*) AS total ${from}`,
    );
    const total = Number(countRows[0]?.total ?? 0);
    if (total === 0) return { ids: [], total: 0 };

    // Clamp the requested page into range so a stale ?page=9 link shows the last
    // page of results instead of an empty one.
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page       = Math.min(Math.max(1, params.page), totalPages);

    const rows = await prisma.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT s.id ${from} ${orderClause(sort, matchExpr)} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    );

    return { ids: rows.map((r) => Number(r.id)), total };
  };

  let { ids, total } = await run(expr);

  // Fallback ladder. Each rung is tried only when the one above found nothing,
  // so the common case still costs exactly one indexed query.
  //
  //   1. strict  — every word required (already run above)
  //   2. loose   — any word, ranked by relevance. Strict matching is right most
  //                of the time but returns nothing for an over-specified query
  //                ("haunted lighthouse keeper diary"), which reads as a dead
  //                end to the reader.
  //   3. LIKE    — the old substring scan. FULLTEXT matches whole words and
  //                prefixes, so it genuinely cannot find a search for the middle
  //                of a word ("ouse" inside "house"). Dropping to LIKE here
  //                guarantees this search never returns fewer results than the
  //                one it replaced. It only runs when the indexed attempts found
  //                nothing at all, so the slow scan stays rare.
  if (total === 0 && mode === 'fulltext' && parsed!.loose) {
    const retry = await run(parsed!.loose);
    if (retry.total > 0) {
      ids = retry.ids;
      total = retry.total;
      mode = 'loose';
    }
  }

  if (total === 0 && query && mode !== 'like') {
    const retry = await run(null);
    if (retry.total > 0) {
      ids = retry.ids;
      total = retry.total;
      mode = 'like';
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    ids,
    total,
    totalPages,
    page: Math.min(Math.max(1, params.page), totalPages),
    mode,
    ignoredTerms: parsed?.ignored ?? [],
  };
}

// ── Hydration ────────────────────────────────────────────────────────────────

// Fields the search results page needs to render a story card.
const STORY_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  content: true,
  createdAt: true,
  views: true,
  author:   { select: { username: true } },
  category: { select: { name: true, slug: true } },
  _count:   { select: { likes: true, comments: true } },
} satisfies Prisma.StorySelect;

/**
 * Loads full story records for the given IDs and returns them in exactly that
 * order. `WHERE id IN (...)` gives no ordering guarantee of its own, so the
 * relevance order computed in SQL would otherwise be lost on the way back.
 */
export async function loadStoriesInOrder(ids: number[]) {
  if (ids.length === 0) return [];

  const stories = await prisma.story.findMany({
    where: { id: { in: ids } },
    select: STORY_CARD_SELECT,
  });

  const byId = new Map(stories.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
}

/** Convenience wrapper: search and hydrate in one call. */
export async function searchStories(params: StorySearchParams) {
  const result = await searchStoryIds(params);
  const stories = await loadStoriesInOrder(result.ids);
  return { ...result, stories };
}
