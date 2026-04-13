/**
 * app/history/page.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the Reading History Server Component. It:
 *   1. Checks the session cookie — redirects to /login if not logged in.
 *   2. Fetches the user's reading history from the database, newest first.
 *   3. Passes the data to <HistoryClient> which handles the list/grid toggle UI.
 *
 * SERVER vs CLIENT SPLIT:
 * The DB fetch happens here on the server (fast, no client JS needed).
 * The interactive view toggle lives in HistoryClient ('use client').
 * This is the recommended Next.js pattern: fetch on server, interact on client.
 *
 * JSON.parse(JSON.stringify(history)):
 * Prisma returns Date objects. React can't serialise them across the
 * server→client boundary. JSON round-tripping converts all Dates to ISO
 * strings, which are safely serialisable. This is a common workaround.
 *
 * HOW TO REUSE:
 * Any "recently viewed" or "activity log" feature follows this shape:
 *   - A join table (ReadingHistory) with userId + storyId + timestamp
 *   - A server page that fetches and orders by timestamp desc
 *   - A client component that renders the list with optional UI controls
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import HistoryClient from './HistoryClient';

export const metadata = { title: 'Reading History — Silent Evidence' };

export default async function HistoryPage() {
  const cookieStore = await cookies();
  // || null converts 0 (not logged in) to null for cleaner checks
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  // Redirect unauthenticated users before doing any DB work
  if (!userId) redirect('/login');

  // Fetch all reading history entries for this user, newest first.
  // We include the full story details needed to render each card.
  const history = await prisma.readingHistory.findMany({
    where: { userId },
    orderBy: { readAt: 'desc' }, // most recently read stories first
    include: {
      story: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          excerpt: true,
          content: true,  // needed to compute reading time in the client component
          createdAt: true,
          author:   { select: { username: true } },
          category: { select: { name: true, slug: true } },
          _count:   { select: { likes: true, comments: true } },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Decorative red bar + page title */}
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-7 bg-green-600 rounded-full" />
          <h1 className="text-2xl font-bold text-white">Reading History</h1>
        </div>

        {/* JSON.parse(JSON.stringify(...)) converts Prisma Date objects to plain
            ISO strings so they can be safely passed across the server→client boundary */}
        <HistoryClient history={JSON.parse(JSON.stringify(history))} />
      </div>

      <Footer />
    </main>
  );
}
