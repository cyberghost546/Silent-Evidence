// app/trending/page.tsx
// Shows stories ranked by activity velocity — views + likes within the chosen window.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { readingTime } from '@/lib/readingTime';
import TrendingStories from './TrendingStories';

type Props = { searchParams: Promise<{ window?: string }> };

export const metadata = { title: 'Trending — Silent Evidence' };

export default async function TrendingPage({ searchParams }: Props) {
  const { window: win = '24h' } = await searchParams;

  // Map the window param to a cutoff date
  const cutoffMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30 };
  const days = cutoffMap[win] ?? 1;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Fetch published stories with their recent like counts
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 100, // fetch enough to sort by velocity
    include: {
      author: { select: { username: true, isVerified: true, profile: { select: { avatar: true } } } },
      category: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  // Count likes within the time window for each story
  const storyIds = stories.map(s => s.id);
  const recentLikes = await prisma.like.groupBy({
    by: ['storyId'],
    where: { storyId: { in: storyIds }, createdAt: { gte: cutoff } },
    _count: { storyId: true },
  });
  const likesMap = Object.fromEntries(recentLikes.map(r => [r.storyId, r._count.storyId]));

  // Velocity score = recent likes × 3 + total views / 100
  const scored = stories
    .map(s => ({
      ...s,
      score: (likesMap[s.id] ?? 0) * 3 + Math.floor(s.views / 100),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Hero */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.15)_0%,transparent_70%)]" />
        <div className="max-w-5xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔥</span>
            <h1 className="text-4xl font-extrabold text-white">Trending</h1>
          </div>
          <p className="text-gray-400 text-sm">Stories making waves right now</p>

          {/* Time window tabs */}
          <div className="flex gap-2 mt-6">
            {[['24h', 'Today'], ['7d', 'This Week'], ['30d', 'This Month']].map(([val, label]) => (
              <Link
                key={val}
                href={`/trending?window=${val}`}
                className={`px-4 py-1.5 text-sm rounded-full font-medium transition border ${
                  win === val
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {scored.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <p className="text-5xl mb-4">👻</p>
            <p>No trending stories yet for this period.</p>
          </div>
        ) : (
          <TrendingStories stories={JSON.parse(JSON.stringify(scored))} />
        )}
      </div>

      <Footer />
    </main>
  );
}
