// =============================================================================
// LatestStories.tsx  —  SERVER COMPONENT
// =============================================================================
// Purpose:
//   Fetches the 6 most recently published stories from the database and passes
//   them to LatestStoriesSection (the interactive client component). This file
//   deliberately contains zero interactivity so it can run entirely on the
//   server — no JavaScript is shipped to the browser for this layer.
//
// Usage:
//   <LatestStories />                     — full-width with standard padding
//   <LatestStories standalone />          — no outer padding (embed inside a container)
//
// Props:
//   standalone?: boolean  — when true, removes the outer max-width/padding wrapper
//                           so this can sit inside another layout container without
//                           double-padding.
//
// Architecture — Server / Client split:
//   LatestStories  (this file) — async Server Component; accesses Prisma + cookies
//   LatestStoriesSection       — 'use client' component; handles mood filtering,
//                                infinite scroll, and live reader counts
//
//   Why split? Server Components can read cookies, access the database, and cache
//   data at the edge — none of which is possible in a client component. The client
//   component handles all the interactive pieces that require browser APIs.
//
// Caching strategy:
//   The Prisma query is wrapped in a shared cache() helper (TTL.MEDIUM = 5 min).
//   The cache key ("homepage:latest-stories") has no user-specific data, so ALL
//   visitors share the same cached result and we avoid a DB round-trip on every
//   page load during high traffic. Per-user "already read" badges are fetched
//   separately (and NOT cached) because that data is user-specific.
//
// Data serialisation:
//   Next.js requires plain JSON-serialisable values when passing data from a
//   Server Component to a Client Component. Prisma returns Date objects and
//   potentially BigInt values, so we run JSON.parse(JSON.stringify(...)) to
//   convert them to strings/numbers before passing to LatestStoriesSection.
// =============================================================================

import { cookies } from 'next/headers'; // reads HTTP-only cookies server-side
import { prisma } from '@/lib/prisma'; // the shared Prisma client instance
import { cache, TTL } from '@/lib/cache'; // in-memory cache helper + TTL constants
import LatestStoriesSection from './LatestStoriesSection';

// standalone — when true, removes the outer padding wrapper so this can nest
// inside another layout container without double-padding.
export default async function LatestStories({ standalone }: { standalone?: boolean } = {}) {
  // ── Read the current user's id from the session cookie ──────────────────
  // cookies() is a Next.js 14 Server Component API that reads the incoming
  // request cookies synchronously. We await it because it returns a Promise
  // in the App Router.
  // The userId cookie is set at login and removed at logout.
  // Coerce to null if the cookie is missing or not a valid number (guests).
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // ── Fetch the 6 newest published stories (cached for 5 minutes) ──────────
  // cache() wraps the Prisma call with an in-memory memoisation layer so that
  // every visitor within the 5-minute window shares a single DB query result.
  //
  // Prisma include vs select:
  //   - include fetches entire related records (author, category rows)
  //   - _count.select fetches aggregate counts without loading all related rows
  //     This is more efficient than pulling all Likes and then calling .length.
  const stories = await cache('homepage:latest-stories', TTL.MEDIUM, () =>
    prisma.story.findMany({
      where: { status: 'PUBLISHED' }, // only show stories the author has published
      orderBy: { createdAt: 'desc' }, // newest first
      take: 6, // hard limit — 6 cards fit a 3-column grid cleanly
      include: {
        // Fetch only the username — we don't need the author's email, bio, etc.
        author: { select: { username: true } },
        // Fetch only category name + slug for the category pill on each card.
        category: { select: { name: true, slug: true } },
        // Count likes and comments via a SQL aggregate — much faster than
        // loading all Like/Comment rows and counting in JS.
        _count: { select: { likes: true, comments: true } },
      },
    })
  );

  // ── Fetch read history for the logged-in user (not cached — user-specific) ──
  // If the user is logged in, query which of these 6 stories they've already read.
  // The client component uses this to show a "✓ Read" badge on cards.
  //
  // Why a separate query and not part of the cached one?
  //   The cached query is shared across all users; per-user data cannot be part of it.
  //   This extra query is cheap because we filter by userId + storyId IN (...) with a
  //   tiny result set (max 6 rows).
  let readIds: number[] = [];
  if (userId) {
    try {
      const rows = await prisma.readingHistory.findMany({
        where: {
          userId,
          // Only check against the ids we already have — avoids a full table scan.
          storyId: { in: stories.map((s) => s.id) },
        },
        select: { storyId: true }, // we only need the id, not the full history row
      });
      readIds = rows.map((r) => r.storyId);
    } catch {
      // The readingHistory table may not exist in older DB migrations
      // (it was added later). Safe to skip — badges just won't appear.
    }
  }

  // ── Early return if there are no published stories ───────────────────────
  // Returning null renders nothing — the <section> won't appear on the page.
  // This prevents an empty "Latest Stories" heading with no cards under it.
  if (stories.length === 0) return null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    // Conditional wrapper:
    //   standalone=true  → no wrapper (parent controls padding)
    //   standalone=false → max-w-6xl centered block with horizontal padding
    <section className={standalone ? '' : 'max-w-6xl mx-auto px-4 pb-14'}>
      <LatestStoriesSection
        // JSON.parse(JSON.stringify(...)) serialises Prisma Date objects to ISO
        // strings and BigInts to numbers. Next.js enforces that data passed from
        // Server → Client Components must be JSON-serialisable (no class instances).
        initialStories={JSON.parse(JSON.stringify(stories))}
        // Array of storyIds already read by this user (empty array for guests).
        readIds={readIds}
      />
    </section>
  );
}
