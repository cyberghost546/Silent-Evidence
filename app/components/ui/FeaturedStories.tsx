// app/components/ui/FeaturedStories.tsx
// Server component — fetches up to 5 stories marked `featured: true` and renders them
// as a large hero card (the first/newest story) + up to 4 smaller side cards.
// Because this is a server component, the DB query runs on the server — no API call needed.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function FeaturedStories() {
  // Only show published stories that an admin has specifically marked as featured.
  // Ordered newest-first so freshly featured stories appear in the hero slot.
  const stories = await prisma.story.findMany({
    where: { featured: true, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    // include fetches relations in optimised extra queries rather than N+1 queries
    include: {
      author: { select: { username: true } },
      category: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  // If no stories are marked featured yet, don't render the section at all
  if (stories.length === 0) return null;

  // Destructure: `hero` gets the first (newest) story, `rest` gets up to 4 more
  const [hero, ...rest] = stories;

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-8">
        <span className="w-1 h-6 bg-red-600 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Featured Stories</h2>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Hero card (left, spans 3 cols) ─────────────────── */}
        <Link
          href={`/story/${hero.slug}`}
          className="lg:col-span-3 group relative rounded-2xl overflow-hidden bg-gray-800 border border-gray-700 hover:border-red-600 transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]"
        >
          {/* Cover image */}
          <div className="relative h-72 lg:h-full min-h-[320px] overflow-hidden">
            {hero.coverImage ? (
              <img
                src={hero.coverImage}
                alt={hero.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </div>

          {/* Text overlaid on image — text-on-image keeps text white in light mode */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-on-image">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-red-400 mb-2">
              {hero.category.name}
            </span>
            <h3 className="text-2xl font-bold text-white leading-snug mb-2 group-hover:text-red-300 transition-colors">
              {hero.title}
            </h3>
            {hero.excerpt && (
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{hero.excerpt}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>by {hero.author.username}</span>
              <span>·</span>
              <span>{new Date(hero.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                </svg>
                {hero._count.likes}
              </span>
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {hero._count.comments}
              </span>
            </div>
          </div>
        </Link>

        {/* ── Side cards (right, spans 2 cols) ───────────────── */}
        {rest.length > 0 && (
          <div className="lg:col-span-2 flex flex-col gap-4">
            {rest.map((story) => (
              <Link
                key={story.id}
                href={`/story/${story.slug}`}
                className="group flex gap-4 bg-gray-800 border border-gray-700 hover:border-red-600 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]"
              >
                {/* Thumbnail */}
                <div className="w-28 flex-shrink-0 overflow-hidden">
                  {story.coverImage ? (
                    <img
                      src={story.coverImage}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 min-h-[100px]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center py-3 pr-4 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500 mb-1">
                    {story.category.name}
                  </span>
                  <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-red-300 transition-colors">
                    {story.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <span>{story.author.username}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                      </svg>
                      {story._count.likes}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
