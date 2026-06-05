// PopularStories.tsx
// Server component — shows the top stories ranked by like count.
// Stories with at least 1 like are shown automatically (no admin action needed).

import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { cache, TTL } from '@/lib/cache';
import ReadingBadge from './ReadingBadge';

export default async function PopularStories() {
  // Cached 5 minutes — like-ranked list doesn't need real-time accuracy.
  const stories = await cache('homepage:popular', TTL.MEDIUM, () =>
    prisma.story.findMany({
      where: { status: 'PUBLISHED', likes: { some: {} } },
      orderBy: { likes: { _count: 'desc' } },
      take: 6,
      include: {
        author: { select: { username: true } },
        category: { select: { name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
      },
    })
  );

  if (stories.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 pb-12">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-8">
        <span className="w-1 h-6 bg-red-600 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Popular Stories</h2>
        <span className="text-xs text-gray-500 ml-1">ranked by likes</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stories.map((story, index) => (
          <Link
            key={story.id}
            href={`/story/${story.slug}`}
            className="group relative bg-gray-800 border border-gray-700 hover:border-red-600 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)] flex flex-col"
          >
            {/* Rank badge */}
            <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-xs font-bold text-white border border-gray-600">
              #{index + 1}
            </div>

            {/* Cover image */}
            <div className="h-44 overflow-hidden relative">
              {story.coverImage ? (
                <Image
                  src={story.coverImage}
                  alt={story.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-800/80 to-transparent" />
              <ReadingBadge storyId={story.id} />
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                {story.category.name}
              </span>
              <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-red-300 transition-colors">
                {story.title}
              </h3>
              {story.excerpt && (
                <p className="text-xs text-gray-500 line-clamp-2">{story.excerpt}</p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-gray-500">
                <span>{story.author.username}</span>
                <span className="ml-auto flex items-center gap-1 text-red-400 font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                  </svg>
                  {story._count.likes}
                </span>
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {story._count.comments}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
