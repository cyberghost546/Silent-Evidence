// app/components/ui/TrendingStories.tsx
// Sidebar / homepage widget that shows the top 5 trending stories of the past 7 days.
//
// "Trending" is determined by view count — the most-viewed recently-published stories
// appear first. If not enough stories exist from the past week (fewer than 3), it
// falls back to all-time most-viewed so the section is never empty.
//
// This is a server component — it runs on the server and fetches data from the database
// directly, so there's no visible loading spinner on the page.

import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { cache, TTL } from '@/lib/cache';

export default async function TrendingStories() {
  // Wrap the database query in a cache so repeated page loads within a 5-minute
  // window don't hammer the database — TTL.MEDIUM is typically 5 minutes.
  // The string 'trending:stories' is the unique cache key for this data.
  const list = await cache('trending:stories', TTL.MEDIUM, async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Fetch candidate stories published in the last 30 days
    const stories = await prisma.story.findMany({
      where: { status: 'PUBLISHED', createdAt: { gte: thirtyDaysAgo } },
      take: 60,
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        coverImage: true,
        createdAt: true,
        author: { select: { username: true } },
        category: { select: { name: true, slug: true } },
        likes: { where: { createdAt: { gte: fortyEightHoursAgo } }, select: { id: true } },
        comments: { where: { createdAt: { gte: fortyEightHoursAgo } }, select: { id: true } },
        _count: { select: { likes: true } },
      },
    });

    const now = Date.now();
    const scored = stories
      .map((s) => {
        const ageDays = (now - s.createdAt.getTime()) / 86400000;
        const recency = ageDays < 1 ? 20 : ageDays < 3 ? 10 : ageDays < 7 ? 5 : 0;
        const score = s.likes.length * 5 + s.comments.length * 8 + s.views * 0.1 + recency;
        const { likes, comments, ...rest } = s;
        void likes;
        void comments;
        return { ...rest, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length >= 3) return scored;

    // Cold-start fallback: no recent activity → most-viewed all time
    const fallback = await prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { views: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        coverImage: true,
        createdAt: true,
        author: { select: { username: true } },
        category: { select: { name: true, slug: true } },
        _count: { select: { likes: true } },
      },
    });
    return fallback.map((s) => ({ ...s, score: s.views }));
  });

  // If there are truly no stories at all, show a friendly placeholder
  if (list.length === 0) {
    return (
      <section className="pb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-6 bg-orange-500 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Trending</h2>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">No trending stories yet this week.</p>
          <p className="text-gray-600 text-xs mt-1">
            Check back soon — or be the first to write one.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="pb-14">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-6 bg-orange-500 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Trending</h2>
        <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
          This week
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {list.map((story, i) => (
          <Link
            key={story.id}
            href={`/story/${story.slug}`}
            className="group flex items-center gap-4 bg-gray-800 border border-gray-700 hover:border-orange-500/40 rounded-xl p-4 transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]"
          >
            {/* Rank number — gold for #1, silver for #2, bronze for #3, grey for the rest */}
            <span
              className={`text-2xl font-extrabold w-8 text-center flex-shrink-0 ${
                i === 0
                  ? 'text-red-400'
                  : i === 1
                    ? 'text-gray-400'
                    : i === 2
                      ? 'text-amber-700'
                      : 'text-gray-600'
              }`}
            >
              {i + 1}
            </span>
            {story.coverImage && (
              // Using Next.js Image for automatic resizing, WebP conversion, and lazy loading
              <Image
                src={story.coverImage}
                alt={story.title}
                width={56}
                height={56}
                className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-0.5">
                {story.category.name}
              </p>
              <h3 className="text-sm font-semibold text-white group-hover:text-orange-300 transition line-clamp-1">
                {story.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{story.author.username}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0 text-xs text-gray-500">
              <span>{story.views.toLocaleString()}</span>
              <span>{story._count.likes}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
