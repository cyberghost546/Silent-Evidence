// app/leaderboard/page.tsx
// Server-rendered leaderboard that ranks authors by total likes across all
// of their published stories. The top 20 authors are shown.
// Because all the data comes from the database at request time, the page is
// always up to date — no client-side fetching needed.

import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';

export const metadata: Metadata = {
  title: 'Leaderboard — Silent Evidence',
  description: 'The top horror story writers on Silent Evidence, ranked by reader likes. Who reigns supreme in the darkness?',
};

export default async function LeaderboardPage() {
  // Fetch every user who has at least one published story, including:
  //   - their profile avatar
  //   - all their published stories (with view count and like count)
  //   - how many followers they have
  const authors = await prisma.user.findMany({
    where: { stories: { some: { status: 'PUBLISHED' } } },
    include: {
      profile: { select: { avatar: true } },
      stories: {
        where: { status: 'PUBLISHED' },
        select: { views: true, _count: { select: { likes: true } } },
      },
      _count: { select: { followers: true } },
    },
  });

  // Transform the raw Prisma data into a simpler shape, then sort and slice.
  // We use Array.reduce to sum up likes/views across all of an author's stories.
  const ranked = authors
    .map(u => ({
      id: u.id,
      username: u.username,
      // Fall back to a generated colour avatar if the user hasn't uploaded one
      avatar: u.profile?.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=dc2626&color=fff&size=64`,
      stories: u.stories.length,
      // Sum likes across all published stories for this author
      totalLikes: u.stories.reduce((s, st) => s + st._count.likes, 0),
      // Sum views across all published stories for this author
      totalViews: u.stories.reduce((s, st) => s + st.views, 0),
      followers: u._count.followers,
    }))
    .sort((a, b) => b.totalLikes - a.totalLikes) // highest likes first
    .slice(0, 20); // only show the top 20

  // Emoji medals for the top 3 spots; everyone else gets a plain "#N" number
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Page header with a subtle red glow behind it */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.08)_0%,_transparent_60%)]" />
        <div className="max-w-3xl mx-auto px-4 text-center relative">
          <h1 className="text-3xl font-extrabold text-white">Leaderboard</h1>
          <p className="text-gray-400 mt-2">Top authors ranked by total likes</p>
        </div>
      </div>

      {/* Ranked author list */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {ranked.length === 0 ? (
          // Edge case: no one has published a story yet
          <p className="text-center text-gray-500 py-20">No authors yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {ranked.map((author, i) => (
              // Each row links to the author's public profile page
              <Link
                key={author.id}
                href={`/user/${author.username}`}
                className="flex items-center gap-4 bg-gray-800 border border-gray-700 hover:border-red-600/40 rounded-xl px-5 py-4 transition-all"
              >
                {/* Rank indicator — medal emoji for top 3, plain number for the rest */}
                <span className="text-xl w-8 text-center flex-shrink-0">
                  {medals[i] ?? <span className="text-gray-500 font-bold text-sm">#{i + 1}</span>}
                </span>

                {/* Author avatar */}
                <img src={author.avatar} alt={author.username} className="w-10 h-10 rounded-full object-cover border border-gray-700 flex-shrink-0" />

                {/* Author name and quick stats */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{author.username}</p>
                  {/* Pluralise "story" correctly */}
                  <p className="text-xs text-gray-500">{author.stories} {author.stories === 1 ? 'story' : 'stories'} · {author.followers} followers</p>
                </div>

                {/* Likes and views — views are hidden on small screens to save space */}
                <div className="flex items-center gap-5 text-sm text-gray-400 flex-shrink-0">
                  <div className="text-center">
                    <p className="font-bold text-white">{author.totalLikes}</p>
                    <p className="text-xs text-gray-600">likes</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    {/* toLocaleString adds commas for readability (e.g. 12,345) */}
                    <p className="font-bold text-white">{author.totalViews.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">views</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
