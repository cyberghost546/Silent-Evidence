// app/search/page.tsx
//
// Server Component — story search with multi-dimensional filtering.
// All filtering, ranking, counting and pagination happen DB-side.
// SearchStories is the client component that handles the list/grid toggle.
//
// FILTERS (each maps to a URL param):
//   ?q=         — text search across title, excerpt, content, category, author, tags
//   ?category=  — filter by category slug
//   ?mood=      — filter by the story's mood enum value (see lib/moods.ts)
//   ?readTime=  — short/medium/long band
//   ?sort=      — relevance/newest/popular/comments
//   ?page=      — pagination offset
//
// HOW MATCHING WORKS
//   The query itself is handled by lib/search.ts, which uses the MariaDB FULLTEXT
//   indexes on Story via MATCH ... AGAINST. That module owns the SQL; this page
//   only collects params, renders results, and builds filter links. See the
//   comments there for the ranking rules and the fallback ladder.
//
// `filterHref()` builds a URL for filter links by merging the current params with
//   overrides. This lets each pill link preserve other active filters while changing
//   only the one it controls — e.g. clicking a category pill keeps ?q= and ?mood=.
//
// PEOPLE RESULTS:
//   When a query is present, we also search for users by username (up to 6 results)
//   and show them in a "People" section above the story results.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Pagination from '@/app/components/ui/Pagination';
import { cookies } from 'next/headers';
import SearchStories from './SearchStories';
import { searchStories, type SearchSort } from '@/lib/search';
import { viewerRatings } from '@/lib/ageGate';
import { MOODS, MOOD_META } from '@/lib/moods';

const PAGE_SIZE = 12;

const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: 'relevance', label: 'Best match' },
  { value: 'newest',    label: 'Newest' },
  { value: 'popular',   label: 'Most liked' },
  { value: 'comments',  label: 'Most discussed' },
];

const VALID_SORTS = new Set<string>(SORT_OPTIONS.map((o) => o.value));

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    mood?: string;
    readTime?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query    = sp.q?.trim() ?? '';
  const catSlug  = sp.category ?? '';
  const mood     = sp.mood ?? '';
  const readTime = sp.readTime ?? '';
  const page     = Math.max(1, Number(sp.page ?? 1) || 1);

  // Relevance only means something when there is a query to be relevant to, so
  // a text search defaults to best-match and plain browsing defaults to newest.
  const requestedSort = sp.sort && VALID_SORTS.has(sp.sort) ? (sp.sort as SearchSort) : '';
  const sort: SearchSort = requestedSort || (query ? 'relevance' : 'newest');

  const hasFilters = Boolean(query || catSlug || mood || readTime);

  const cookieStore = await cookies();
  const viewerId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // ── Age gate ───────────────────────────────────────────────────────────────
  // Search used to list stories at any content rating, so a MATURE story a minor
  // could not open was still shown — title, excerpt and cover included — as soon
  // as they searched for it. The mapping lives in lib/ageGate.ts.
  const allowedRatings = await viewerRatings();

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  // Search users whose username contains the query (max 6 results shown).
  // Left as a LIKE scan on purpose: the user table is small and a username is a
  // single short column, so there is nothing for a FULLTEXT index to earn here.
  const matchedUsers = query
    ? await prisma.user.findMany({
        where: { username: { contains: query } },
        take: 6,
        select: {
          id: true,
          username: true,
          profile: { select: { avatar: true, bio: true } },
          _count: { select: { stories: true, followers: true } },
        },
      })
    : [];

  const {
    stories: results,
    total,
    totalPages,
    page: currentPage,
    mode,
    ignoredTerms,
  } = hasFilters
    ? await searchStories({
        query,
        categorySlug: catSlug,
        mood,
        readTime,
        sort,
        allowedRatings,
        page,
        pageSize: PAGE_SIZE,
      })
    : { stories: [], total: 0, totalPages: 1, page: 1, mode: 'browse' as const, ignoredTerms: [] };

  // Build URL for filters (preserving other params)
  function filterHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (query)         p.set('q',        query);
    if (catSlug)       p.set('category', catSlug);
    if (mood)          p.set('mood',     mood);
    if (readTime)      p.set('readTime', readTime);
    if (requestedSort) p.set('sort',     requestedSort);
    p.set('page', '1');
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    return `/search?${p.toString()}`;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {query ? `Results for "${query}"` : catSlug ? `Category: ${categories.find(c => c.slug === catSlug)?.name ?? catSlug}` : 'Search'}
          </h1>
          {hasFilters && (
            <p className="text-gray-500 text-sm mt-1">{total} {total === 1 ? 'story' : 'stories'} found</p>
          )}

          {/* Explain a widened search rather than silently changing what was asked for */}
          {mode === 'loose' && total > 0 && (
            <p className="text-amber-500/80 text-xs mt-2">
              No story matched every word, so these match some of them.
            </p>
          )}
          {ignoredTerms.length > 0 && (
            <p className="text-gray-600 text-xs mt-2">
              Ignored short words: {ignoredTerms.map(t => `"${t}"`).join(', ')} — try three letters or more.
            </p>
          )}
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-gray-800">
          {/* Category filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Category</span>
            <div className="flex flex-wrap gap-1">
              <Link href={filterHref({ category: '' })}
                className={`px-3 py-1 text-xs rounded-full border transition ${!catSlug ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                All
              </Link>
              {categories.map(c => (
                <Link key={c.slug} href={filterHref({ category: c.slug })}
                  className={`px-3 py-1 text-xs rounded-full border transition ${catSlug === c.slug ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Mood filter — vocabulary comes from lib/moods.ts, the single source of
              truth. This list used to be hard-coded here with the old non-horror
              mood names (GOTHIC, PARANORMAL, SLASHER…), none of which are valid
              Mood values any more, so most of these pills could never match. */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">Mood</span>
            <div className="flex flex-wrap gap-1">
              <Link href={filterHref({ mood: '' })}
                className={`px-3 py-1 text-xs rounded-full border transition ${!mood ? 'bg-purple-700 border-purple-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                Any
              </Link>
              {MOODS.map(m => (
                <Link key={m} href={filterHref({ mood: m })}
                  className={`px-3 py-1 text-xs rounded-full border transition ${mood === m ? 'bg-purple-700 border-purple-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                  {MOOD_META[m].label}
                </Link>
              ))}
            </div>
          </div>

          {/* Reading time filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">Length</span>
            <div className="flex gap-1">
              {[['', 'Any'], ['short', '< 5 min'], ['medium', '5–15 min'], ['long', '15+ min']].map(([val, label]) => (
                <Link key={val} href={filterHref({ readTime: val })}
                  className={`px-3 py-1 text-xs rounded-full border transition ${readTime === val ? 'bg-blue-700 border-blue-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Sort — "Best match" is only offered when there is a query to rank against */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Sort</span>
            {SORT_OPTIONS.filter(opt => opt.value !== 'relevance' || query).map(opt => (
              <Link key={opt.value} href={filterHref({ sort: opt.value })}
                className={`px-3 py-1 text-xs rounded-full border transition ${sort === opt.value ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── People results ───────────────────────────────────────────── */}
        {matchedUsers.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">People</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matchedUsers.map((u) => {
                const avatar =
                  u.profile?.avatar ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=dc2626&color=fff&size=64`;
                return (
                  <Link
                    key={u.id}
                    href={`/user/${u.username}`}
                    className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-red-600/50 rounded-xl px-4 py-3 transition-all group"
                  >
                    {/* Avatar */}
                    <img
                      src={avatar}
                      alt={u.username}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 border-gray-700"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white group-hover:text-red-400 transition truncate">
                        {u.username}
                      </p>
                      {u.profile?.bio && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{u.profile.bio}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-0.5">
                        {u._count.stories} {u._count.stories === 1 ? 'story' : 'stories'} · {u._count.followers} {u._count.followers === 1 ? 'follower' : 'followers'}
                      </p>
                    </div>

                    {/* Hide the arrow for the viewer's own profile */}
                    {viewerId !== u.id && (
                      <span className="text-gray-600 group-hover:text-red-500 transition text-lg">›</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* No query yet */}
        {!hasFilters && (
          <div className="text-center py-20 text-gray-600">
            <p>Type something in the search bar or pick a category to find stories.</p>
            <p className="mt-2 text-sm">Use &quot;quotation marks&quot; to search for an exact phrase.</p>
          </div>
        )}

        {/* No results */}
        {hasFilters && results.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <p>No stories matched your search.</p>
            <p className="mt-2 text-sm">Try a different word or remove a filter.</p>
          </div>
        )}

        {/* Results — list/grid toggle */}
        {results.length > 0 && (
          <>
            {/* "Stories" label — only when user results are also showing */}
            {matchedUsers.length > 0 && (
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Stories</h2>
            )}
            <SearchStories
              stories={JSON.parse(JSON.stringify(results))}
              paginationNode={
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  // Every active filter has to survive paging. This previously
                  // dropped mood and readTime, so clicking page 2 of a filtered
                  // search silently widened it back out to everything.
                  buildHref={(p) => {
                    const params = new URLSearchParams();
                    if (query)         params.set('q',        query);
                    if (catSlug)       params.set('category', catSlug);
                    if (mood)          params.set('mood',     mood);
                    if (readTime)      params.set('readTime', readTime);
                    if (requestedSort) params.set('sort',     requestedSort);
                    params.set('page', String(p));
                    return `/search?${params.toString()}`;
                  }}
                />
              }
            />
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
