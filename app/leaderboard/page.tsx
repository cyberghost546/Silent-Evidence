// app/leaderboard/page.tsx
// Two tabs: All Writers (ranked by total likes) and Elite (premium subscribers only).

import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import PremiumBadge from '@/app/components/ui/PremiumBadge';

export const metadata: Metadata = {
  title: 'Leaderboard — Silent Evidence',
  description:
    'Top horror story writers ranked by reader likes. Who reigns supreme in the darkness?',
};

type Props = { searchParams: Promise<{ tab?: string }> };

async function fetchRanked(premiumOnly: boolean) {
  const authors = await prisma.user.findMany({
    where: {
      stories: { some: { status: 'PUBLISHED' } },
      ...(premiumOnly ? { subscription: { status: 'active' } } : {}),
    },
    include: {
      profile: { select: { avatar: true } },
      stories: {
        where: { status: 'PUBLISHED' },
        select: { views: true, _count: { select: { likes: true } } },
      },
      _count: { select: { followers: true } },
    },
  });

  return authors
    .map((u) => ({
      id: u.id,
      username: u.username,
      avatar:
        u.profile?.avatar ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=dc2626&color=fff&size=64`,
      stories: u.stories.length,
      totalLikes: u.stories.reduce((s, st) => s + st._count.likes, 0),
      totalViews: u.stories.reduce((s, st) => s + st.views, 0),
      followers: u._count.followers,
    }))
    .sort((a, b) => b.totalLikes - a.totalLikes)
    .slice(0, 20);
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const isElite = tab === 'elite';

  const ranked = await fetchRanked(isElite);
  // Top three are distinguished by colour rather than a glyph.
  const medalTone = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Hero */}
      <div
        className={`relative border-b border-gray-800 py-12 overflow-hidden ${isElite ? 'bg-yellow-950/30' : 'bg-gray-950'}`}
      >
        <div
          className={`absolute inset-0 ${
            isElite
              ? 'bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.10)_0%,_transparent_60%)]'
              : 'bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.08)_0%,_transparent_60%)]'
          }`}
        />
        <div className="max-w-3xl mx-auto px-4 text-center relative">
          <h1 className="text-3xl font-extrabold text-white">
            {isElite ? 'Elite Leaderboard' : 'Leaderboard'}
          </h1>
          <p className={`mt-2 text-sm ${isElite ? 'text-yellow-400/80' : 'text-gray-400'}`}>
            {isElite
              ? 'Premium members only — the finest horror writers on Silent Evidence'
              : 'Top authors ranked by total likes'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex gap-2 border-b border-gray-800 pb-0">
          <Link
            href="/leaderboard"
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
              !isElite
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            All Writers
          </Link>
          <Link
            href="/leaderboard?tab=elite"
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition flex items-center gap-1.5 ${
              isElite
                ? 'border-yellow-500 text-yellow-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Elite Members
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {ranked.length === 0 ? (
          <p className="text-center text-gray-500 py-20">
            {isElite ? 'No elite members have published yet.' : 'No authors yet.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {ranked.map((author, i) => (
              <Link
                key={author.id}
                href={`/user/${author.username}`}
                className={`flex items-center gap-4 border rounded-xl px-5 py-4 transition-all ${
                  isElite
                    ? 'bg-yellow-950/20 border-yellow-800/30 hover:border-yellow-600/40'
                    : 'bg-gray-800 border-gray-700 hover:border-red-600/40'
                } ${i === 0 && isElite ? 'ring-1 ring-yellow-500/30' : ''}`}
              >
                {/* Rank */}
                <span
                  className={`w-8 text-center shrink-0 font-bold text-sm ${medalTone[i] ?? 'text-gray-500'}`}
                >
                  #{i + 1}
                </span>

                {/* Avatar */}
                <img
                  src={author.avatar}
                  alt={author.username}
                  className={`w-10 h-10 rounded-full object-cover shrink-0 ${
                    isElite ? 'border-2 border-yellow-500/40' : 'border border-gray-700'
                  }`}
                />

                {/* Name + stats */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">{author.username}</p>
                    {isElite && <PremiumBadge size="sm" />}
                  </div>
                  <p className="text-xs text-gray-500">
                    {author.stories} {author.stories === 1 ? 'story' : 'stories'} ·{' '}
                    {author.followers} followers
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-5 text-sm text-gray-400 shrink-0">
                  <div className="text-center">
                    <p className={`font-bold ${isElite ? 'text-yellow-300' : 'text-white'}`}>
                      {author.totalLikes}
                    </p>
                    <p className="text-xs text-gray-600">likes</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="font-bold text-white">{author.totalViews.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">views</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {isElite && (
          <p className="text-center text-xs text-gray-600 mt-8">
            Only Horror Elite subscribers appear here.{' '}
            <Link href="/premium" className="text-yellow-600 hover:text-yellow-500 transition">
              Join Elite →
            </Link>
          </p>
        )}
      </div>

      <Footer />
    </main>
  );
}
