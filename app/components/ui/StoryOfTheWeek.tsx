// StoryOfTheWeek.tsx
// Server component — displays the admin-pinned Story of the Week on the homepage.
// If no story is pinned in SiteSetting, it falls back to the most-liked story
// from the past 7 days so the section is never empty.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { readingTime } from '@/lib/readingTime';

export default async function StoryOfTheWeek() {
  // 1. Check if an admin has manually pinned a story
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'story_of_week_id' } });
  const pinnedId = setting?.value ? Number(setting.value) : null;

  // 2. Fetch either the pinned story or the top-liked story of the past 7 days
  let story = null;

  if (pinnedId) {
    story = await prisma.story.findUnique({
      where: { id: pinnedId, status: 'PUBLISHED' },
      select: {
        id: true, title: true, slug: true, excerpt: true, content: true, coverImage: true,
        author: { select: { username: true, profile: { select: { avatar: true } } } },
        category: { select: { name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  if (!story) {
    // Fallback: highest-liked published story from the past 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidates = await prisma.story.findMany({
      where: { status: 'PUBLISHED', createdAt: { gte: oneWeekAgo } },
      select: {
        id: true, title: true, slug: true, excerpt: true, content: true, coverImage: true,
        author: { select: { username: true, profile: { select: { avatar: true } } } },
        category: { select: { name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { likes: { _count: 'desc' } },
      take: 1,
    });
    story = candidates[0] ?? null;
  }

  if (!story) return null;

  const authorAvatar = story.author.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=dc2626&color=fff&size=64`;

  return (
    <section className="max-w-6xl mx-auto px-4 pb-14">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-6 bg-red-600 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Story of the Week</h2>
        <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
          🏆 This week&apos;s pick
        </span>
      </div>

      {/* Story card — horizontal layout on desktop */}
      <div className="group relative flex flex-col md:flex-row overflow-hidden bg-gray-800 border border-gray-700 hover:border-red-600/40 rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.1)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.35)]">

        {/* Cover image */}
        <Link href={`/story/${story.slug}`} className="md:w-96 h-56 md:h-auto flex-shrink-0 overflow-hidden relative block">
          {story.coverImage ? (
            <img
              src={story.coverImage}
              alt={story.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            // Gradient placeholder when no cover image is set
            <div className="w-full h-full bg-gradient-to-br from-red-900/40 to-gray-900 flex items-center justify-center">
              <span className="text-6xl opacity-30">💀</span>
            </div>
          )}
          {/* Fade into the content area on desktop */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-800 hidden md:block" />
        </Link>

        {/* Content */}
        <div className="p-6 md:p-8 flex flex-col justify-center gap-3">
          {/* Category */}
          <Link
            href={`/category/${story.category.slug}`}
            className="text-xs font-bold uppercase tracking-widest text-red-400 w-fit"
          >
            {story.category.name}
          </Link>

          {/* Title */}
          <Link href={`/story/${story.slug}`}>
            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-red-300 transition leading-snug">
              {story.title}
            </h3>
          </Link>

          {/* Excerpt */}
          {story.excerpt && (
            <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{story.excerpt}</p>
          )}

          {/* Author + meta row */}
          <div className="flex items-center gap-3 mt-2">
            <img
              src={authorAvatar}
              alt={story.author.username}
              className="w-7 h-7 rounded-full object-cover border border-gray-600"
            />
            <Link
              href={`/user/${story.author.username}`}
              className="text-sm text-gray-400 hover:text-red-400 transition"
            >
              {story.author.username}
            </Link>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{readingTime(story.content)}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">♥ {story._count.likes}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">💬 {story._count.comments}</span>
          </div>

          {/* CTA link */}
          <Link
            href={`/story/${story.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-400 mt-1 hover:gap-3 transition-all w-fit"
          >
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
