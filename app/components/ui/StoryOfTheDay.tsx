import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { cache, TTL } from '@/lib/cache';
import { readingTime } from '@/lib/readingTime';

export default async function StoryOfTheDay() {
  // Use today's date as a deterministic offset — same story all day for all visitors.
  // Cached for 1 hour (changes daily so no need to re-query more often).
  const dayIndex = Math.floor(Date.now() / 86400000);

  // Count total published stories first — much cheaper than loading all stories
  const totalCount = await cache('story-of-day:count', TTL.LONG, () =>
    prisma.story.count({ where: { status: 'PUBLISHED' } })
  );

  if (totalCount === 0) return null;

  // Skip to the story for today using an offset — only loads 1 row from the DB
  const skip = dayIndex % totalCount;
  const story = await cache(`story-of-day:${dayIndex}`, TTL.DAY, () =>
    prisma.story.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'asc' },
      skip,
      select: {
        id: true, title: true, slug: true, excerpt: true, content: true, coverImage: true,
        author: { select: { username: true, profile: { select: { avatar: true } } } },
        category: { select: { name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
      },
    })
  );

  if (!story) return null;

  const authorAvatar = story.author.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=22c55e&color=fff&size=64`;

  return (
    <section className="max-w-6xl mx-auto px-4 pb-14">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-6 bg-yellow-500 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Story of the Day</h2>
        <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">✨ Today&apos;s pick</span>
      </div>

      <div className="group relative flex flex-col md:flex-row overflow-hidden bg-gray-800 border border-gray-700 hover:border-yellow-500/40 rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]">
        {/* Cover — clicking navigates to story */}
        <Link href={`/story/${story.slug}`} className="md:w-96 h-56 md:h-auto flex-shrink-0 overflow-hidden relative block">
          {story.coverImage ? (
            // Next.js Image — automatic WebP, lazy load, and resizing
            <Image src={story.coverImage} alt={story.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 384px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-yellow-900/30 to-gray-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-800 hidden md:block" />
        </Link>

        {/* Content */}
        <div className="p-6 md:p-8 flex flex-col justify-center gap-3">
          <Link href={`/category/${story.category.slug}`} className="text-xs font-bold uppercase tracking-widest text-yellow-400 w-fit">
            {story.category.name}
          </Link>
          <Link href={`/story/${story.slug}`}>
            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-yellow-300 transition leading-snug">
              {story.title}
            </h3>
          </Link>
          {story.excerpt && (
            <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{story.excerpt}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <Image src={authorAvatar} alt={story.author.username} width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-gray-600" />
            <span className="text-sm text-gray-400">{story.author.username}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{readingTime(story.content)}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">♥ {story._count.likes}</span>
          </div>
          <Link href={`/story/${story.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-400 mt-1 hover:gap-3 transition-all w-fit">
            Read story
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
