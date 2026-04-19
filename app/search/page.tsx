import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Pagination from '@/app/components/ui/Pagination';
import { cookies } from 'next/headers';
import SearchStories from './SearchStories';

const PAGE_SIZE = 12;

// Reading time bands in minutes (approximate word-count thresholds)
const READ_TIME_BANDS: Record<string, [number, number]> = {
  short:  [0,  5],
  medium: [5, 15],
  long:   [15, 999],
};

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
  const sort     = sp.sort ?? 'newest';
  const page     = Math.max(1, Number(sp.page ?? 1));

  const rtBand = READ_TIME_BANDS[readTime] ?? null;

  // Get the viewer's ID so we can show the Follow button on user results
  const cookieStore = await cookies();
  const viewerId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } });

  // Search users whose username contains the query (max 6 results shown)
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

  const orderBy =
    sort === 'popular'  ? { likes:    { _count: 'desc' as const } } :
    sort === 'comments' ? { comments: { _count: 'desc' as const } } :
                          { createdAt: 'desc' as const };

  const whereBase = {
    status: 'PUBLISHED' as const,
    ...(catSlug ? { category: { slug: catSlug } } : {}),
    ...(mood ? { mood: mood as never } : {}),
    ...(query ? {
      OR: [
        { title:    { contains: query } },
        { excerpt:  { contains: query } },
        { content:  { contains: query } },
        { category: { name: { contains: query } } },
        { author:   { username: { contains: query } } },
        { tags:     { some: { name: { contains: query } } } },
      ],
    } : {}),
  };

  const total = query || catSlug ? await prisma.story.count({ where: whereBase }) : 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));

  const rawResults = hasFilters
    ? await prisma.story.findMany({
        where: whereBase,
        orderBy,
        // Fetch extra when reading-time filter is active so we still get PAGE_SIZE after filtering
        skip: rtBand ? 0 : (currentPage - 1) * PAGE_SIZE,
        take: rtBand ? 200 : PAGE_SIZE,
        select: {
          id: true, slug: true, title: true, excerpt: true, coverImage: true, content: true, createdAt: true,
          author:   { select: { username: true } },
          category: { select: { name: true, slug: true } },
          _count:   { select: { likes: true, comments: true } },
        },
      })
    : [];

  // Apply reading-time filter in memory (200 wpm average, 5 chars per word)
  const filtered = rtBand
    ? rawResults.filter(s => {
        const mins = (s.content?.length ?? 0) / 5 / 200;
        return mins >= rtBand[0] && mins < rtBand[1];
      })
    : rawResults;

  const results = rtBand
    ? filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : filtered;

  // Build URL for filters (preserving other params)
  function filterHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (query)    p.set('q',        query);
    if (catSlug)  p.set('category', catSlug);
    if (mood)     p.set('mood',     mood);
    if (readTime) p.set('readTime', readTime);
    if (sort)     p.set('sort',     sort);
    p.set('page', '1');
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    return `/search?${p.toString()}`;
  }

  const MOODS = ['GOTHIC','PARANORMAL','COSMIC','SLASHER','PSYCHOLOGICAL','SUPERNATURAL','GORE','DARK_COMEDY'];

  const hasFilters = query || catSlug || mood || readTime;

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

          {/* Mood filter */}
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
                  {m.charAt(0) + m.slice(1).toLowerCase().replace('_', ' ')}
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

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Sort</span>
            {[
              { value: 'newest',   label: 'Newest' },
              { value: 'popular',  label: 'Most liked' },
              { value: 'comments', label: 'Most discussed' },
            ].map(opt => (
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
            <p className="text-5xl mb-4">🔍</p>
            <p>Type something in the search bar or pick a category to find stories.</p>
          </div>
        )}

        {/* No results */}
        {hasFilters && results.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <p className="text-5xl mb-4">😶</p>
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
                  buildHref={(p) => {
                    const params = new URLSearchParams();
                    if (query)   params.set('q',        query);
                    if (catSlug) params.set('category', catSlug);
                    if (sort)    params.set('sort',     sort);
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
