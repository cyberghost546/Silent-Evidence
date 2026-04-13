/**
 * app/admin/challenges/page.tsx
 * ─────────────────────────────
 * PURPOSE:
 *   This is a Next.js SERVER component — it runs only on the server, never in
 *   the browser.  Its job is to fetch all challenges from the database and pass
 *   them as props to the interactive client component (AdminChallengesClient).
 *
 * WHY SERVER + CLIENT SPLIT?
 *   Next.js encourages this pattern: the server component fetches data (no
 *   loading spinner needed, great for SEO), then passes it to a 'use client'
 *   component which can handle clicks, state, and live updates.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - Duplicate this pattern any time you need an admin list page.
 *   - Replace `prisma.challenge.findMany` with your own data source.
 *   - The `.catch(() => [])` fallback prevents the whole page from crashing if
 *     the database is temporarily unavailable — always a good idea in admin pages.
 */

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import AdminChallengesClient from './AdminChallengesClient';

// Sets the browser tab title for this admin page
export const metadata = { title: 'Challenges — Admin' };

// This is an async server component — Next.js awaits it on the server before
// sending HTML to the browser.  It can call `prisma` directly because it never
// runs in the user's browser.
export default async function AdminChallengesPage() {
  // Fetch all challenges ordered by start date, and include the count of
  // entries for each challenge so we can show it in the table.
  // `_count: { select: { entries: true } }` tells Prisma to run a COUNT(*)
  // on the related entries and attach the result as `_count.entries`.
  // `.catch(() => [])` returns an empty array instead of crashing if the DB is down.
  const challenges = await prisma.challenge.findMany({
    orderBy: { startDate: 'asc' },
    include: { _count: { select: { entries: true } } },
  }).catch(() => []);

  // Pass the data to the client component.
  // Prisma returns Date objects, but client components can only receive plain
  // serialisable values.  We convert each Date to an ISO string with `.toISOString()`
  // so Next.js can safely pass it across the server→client boundary.
  return (
    <AdminChallengesClient
      challenges={challenges.map(c => ({
        id:          c.id,
        title:       c.title,
        description: c.description,
        prompt:      c.prompt,
        // Convert Date objects to ISO strings — client components can't receive Date objects
        startDate:   c.startDate.toISOString(),
        endDate:     c.endDate.toISOString(),
        active:      c.active,
        // Flatten the nested `_count.entries` into a simple number
        entries:     c._count.entries,
      }))}
    />
  );
}
