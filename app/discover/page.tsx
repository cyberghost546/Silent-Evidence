// app/discover/page.tsx
// Server component — fetches published stories (optionally filtered by mood and
// category) and renders filter pills + the SwipeDiscovery swipe deck.
//
// FILTER APPROACH:
//   Filters are URL search params (?mood=CREEPY&category=ghost-stories).
//   Clicking a pill is a regular <Link> that navigates to the new URL — the server
//   re-fetches the right stories and resets the deck to position 0.
//   This keeps all DB logic server-side and avoids an extra client fetch.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import SwipeDiscovery from '@/app/components/ui/SwipeDiscovery';
import { MOOD_OPTIONS } from '@/lib/moods';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover Stories | Silent Evidence',
  description: 'Swipe through horror stories. Save the ones that scare you.',
};

// Mood options — must match the Mood enum values in Prisma schema
// Derived from lib/moods.ts so the filter can only offer moods the database
// accepts. The hard-coded list this replaced held the old generic-fiction
// vocabulary, so most of these filters matched nothing.
const MOODS = MOOD_OPTIONS;

type Props = {
  searchParams: Promise<{ mood?: string; category?: string }>;
};

export default async function DiscoverPage({ searchParams }: Props) {
  const sp       = await searchParams;
  const mood     = sp.mood     ?? '';
  const catSlug  = sp.category ?? '';

  // Fetch categories for the filter pills
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  // Build the where clause — only add filters that are actually set
  const where = {
    status: 'PUBLISHED' as const,
    ...(mood    ? { mood: mood as never }              : {}),
    ...(catSlug ? { category: { slug: catSlug } }      : {}),
  };

  const stories = await prisma.story.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id:         true,
      title:      true,
      slug:       true,
      excerpt:    true,
      coverImage: true,
      mood:       true,
      author: { select: { username: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const serialised = stories.map((s) => ({
    ...s,
    mood: s.mood ? String(s.mood) : null,
  }));

  // Helper — build a filter href that merges the current params with overrides.
  // Passing '' as a value removes that param from the URL.
  function filterHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (mood)    p.set('mood',     mood);
    if (catSlug) p.set('category', catSlug);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    const qs = p.toString();
    return `/discover${qs ? `?${qs}` : ''}`;
  }

  const activePill =
    'px-3 py-1.5 text-xs font-semibold rounded-full border transition bg-red-600 border-red-600 text-white';
  const inactivePill =
    'px-3 py-1.5 text-xs font-semibold rounded-full border transition border-gray-700 text-gray-400 hover:text-white hover:border-gray-500';

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-lg mx-auto px-4 pt-12 pb-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Discover Stories
          </h1>
          <p className="mt-2 text-gray-400 text-sm sm:text-base">
            Swipe right to save, left to skip
          </p>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto px-4 mt-6 space-y-3">

          {/* Mood pills */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Mood</p>
            <div className="flex flex-wrap gap-1.5">
              <Link href={filterHref({ mood: '' })} className={!mood ? activePill : inactivePill}>
                Any
              </Link>
              {MOODS.map((m) => (
                <Link
                  key={m.value}
                  href={filterHref({ mood: m.value })}
                  className={mood === m.value ? activePill : inactivePill}
                >
                  {m.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Category</p>
            <div className="flex flex-wrap gap-1.5">
              <Link href={filterHref({ category: '' })} className={!catSlug ? activePill : inactivePill}>
                All
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={filterHref({ category: c.slug })}
                  className={catSlug === c.slug ? activePill : inactivePill}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Active filter summary + story count */}
          {(mood || catSlug) && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>{serialised.length} {serialised.length === 1 ? 'story' : 'stories'} match</span>
              <Link href="/discover" className="text-red-400 hover:text-red-300 transition">
                Clear filters ✕
              </Link>
            </div>
          )}
        </div>

        {/* ── Swipe deck ───────────────────────────────────────────────────── */}
        <div className="max-w-lg mx-auto px-4 mt-4">
          {serialised.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="text-white font-semibold">No stories found</p>
              <p className="text-gray-400 text-sm">Try a different mood or category.</p>
              <Link
                href="/discover"
                className="mt-2 px-6 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-semibold transition"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <SwipeDiscovery initialStories={serialised} />
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
