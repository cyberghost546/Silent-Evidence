// app/discover/page.tsx
// Server component — fetches 20 recently published stories and renders the
// SwipeDiscovery client component so users can swipe through them.

import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import SwipeDiscovery from '@/app/components/ui/SwipeDiscovery';
import type { Metadata } from 'next';

// ─────────────────────────────────────────────────────────
// Page metadata
// ─────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Discover Stories | Silent Evidence',
  description: 'Swipe through horror stories. Save the ones that scare you.',
};

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default async function DiscoverPage() {
  // Fetch up to 20 published stories, ordered by most recent first.
  // We include the author's username and aggregate counts for likes and comments
  // so the SwipeDiscovery card can display them without extra round-trips.
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id:         true,
      title:      true,
      slug:       true,
      excerpt:    true,
      coverImage: true,
      mood:       true,
      // Only the username is needed for the "by @username" display.
      author: {
        select: { username: true },
      },
      // Prisma _count aggregates likes and comments in a single query.
      _count: {
        select: {
          likes:    true,
          comments: true,
        },
      },
    },
  });

  // Prisma returns Mood as an enum string — SwipeDiscovery expects string | null,
  // so we cast it explicitly to avoid TypeScript complaints.
  const serialised = stories.map((s) => ({
    ...s,
    // Convert the Mood enum value (or null) to a plain string.
    mood: s.mood ? String(s.mood) : null,
  }));

  return (
    <>
      {/* Site-wide header (async server component) */}
      <Header />

      <main className="min-h-screen bg-gray-950 text-white">

        {/* ── Page header ── */}
        <div className="max-w-lg mx-auto px-4 pt-12 pb-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Discover Stories 👻
          </h1>
          <p className="mt-2 text-gray-400 text-sm sm:text-base">
            Swipe right to save, left to skip
          </p>
        </div>

        {/* ── Swipe card area ── */}
        {/* SwipeDiscovery handles all pointer events and bookmark calls client-side */}
        <div className="max-w-lg mx-auto px-4">
          <SwipeDiscovery initialStories={serialised} />
        </div>

      </main>

      {/* Site-wide footer (async server component) */}
      <Footer />
    </>
  );
}
