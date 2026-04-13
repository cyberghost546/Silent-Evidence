// app/components/ui/LatestStories.tsx
// Server component — fetches the 6 most recent published stories and passes them
// to LatestStoriesSection (a client component) which handles mood filtering and
// live reader counts. The split is intentional: server for DB access, client for interactivity.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { cache, TTL } from '@/lib/cache';
import LatestStoriesSection from './LatestStoriesSection';

// standalone — when true, removes the outer padding so this can sit inside another container
export default async function LatestStories({ standalone }: { standalone?: boolean } = {}) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch the 6 newest published stories — cached for 5 minutes (TTL.MEDIUM) to reduce DB load.
  // The cache key has no user-specific data so all logged-in and logged-out visitors share it.
  // This matters a lot on the home page which can have many simultaneous visitors.
  const stories = await cache('homepage:latest-stories', TTL.MEDIUM, () =>
    prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 6,
      // include fetches related rows in a small number of extra queries rather than N+1
      include: {
        author:   { select: { username: true } },
        category: { select: { name: true, slug: true } },
        _count:   { select: { likes: true, comments: true } },
      },
    })
  );

  // Build a list of story IDs the current user has already read.
  // This lets the client component show a "✓ Read" badge on cards the user has seen.
  // Only needed when someone is logged in — guests never get read badges.
  let readIds: number[] = [];
  if (userId) {
    try {
      const rows = await prisma.readingHistory.findMany({
        where: { userId, storyId: { in: stories.map(s => s.id) } },
        select: { storyId: true },
      });
      readIds = rows.map(r => r.storyId);
    } catch {
      // readingHistory table may not exist in older DB migrations — safe to skip
    }
  }

  // Don't render the section if there are no published stories yet
  if (stories.length === 0) return null;

  return (
    <section className={standalone ? '' : 'max-w-6xl mx-auto px-4 pb-14'}>
      <LatestStoriesSection
        // JSON.parse(JSON.stringify(...)) serialises Dates and BigInts to plain values.
        // Next.js requires this when passing data from server components to client components.
        initialStories={JSON.parse(JSON.stringify(stories))}
        readIds={readIds}
      />
    </section>
  );
}
