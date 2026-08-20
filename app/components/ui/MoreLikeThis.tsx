// MoreLikeThis.tsx
// Server component rendered at the bottom of a story page.
// Fetches up to 3 related stories to keep the reader engaged after they finish.
//
// Matching strategy (two-step fallback):
//   1. Try to find stories that share the same category AND the same mood.
//   2. If fewer than 3 are found, pad with stories from the same category only
//      (excluding any already selected and the current story).
//
// Props:
//   storyId    — the ID of the story currently being read (excluded from results)
//   categoryId — the category to match related stories against
//   mood       — optional mood tag; if provided, step 1 attempts a mood match first

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { moodIcon } from '@/lib/moodIcons';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { readingTime } from '@/lib/readingTime';

type Props = { storyId: number; categoryId: number; mood?: string | null };

export default async function MoreLikeThis({ storyId, categoryId, mood }: Props) {
  // Step 1: fetch stories with the same category AND mood (skipped if mood is not set)
  let stories = mood ? await prisma.story.findMany({
    where: { status: 'PUBLISHED', categoryId, mood: mood as any, id: { not: storyId } },
    orderBy: { views: 'desc' },
    take: 3,
    select: {
      id: true, title: true, slug: true, coverImage: true,
      excerpt: true, content: true, mood: true,
      author:   { select: { username: true } },
      category: { select: { name: true } },
      _count:   { select: { likes: true } },
    },
  }) : [];

  // Step 2: if we don't have a full 3 yet, fill with category-only matches
  if (stories.length < 3) {
    const extra = await prisma.story.findMany({
      where: {
        status: 'PUBLISHED',
        categoryId,
        // Exclude the current story and any already fetched in step 1
        id: { notIn: [storyId, ...stories.map(s => s.id)] },
      },
      orderBy: { views: 'desc' },
      take: 3 - stories.length,
      select: {
        id: true, title: true, slug: true, coverImage: true,
        excerpt: true, content: true, mood: true,
        author:   { select: { username: true } },
        category: { select: { name: true } },
        _count:   { select: { likes: true } },
      },
    });
    stories = [...stories, ...extra];
  }

  // Nothing to show — don't render the section at all
  if (stories.length === 0) return null;

  // Icon fallbacks for story cards with no cover image come from lib/moodIcons.

  return (
    <section className="mt-52">
      {/* Section heading with red accent bar */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-1 h-6 bg-red-600 rounded-full" />
        <h2 className="text-lg font-bold text-white">More Like This</h2>
      </div>

      {/* 3-column grid of story cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {stories.map(story => (
          <Link key={story.id} href={`/story/${story.slug}`}
            className="group bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)] flex flex-col">

            {/* Cover image area — shows mood emoji fallback when no image is set */}
            <div className="h-36 overflow-hidden relative">
              {story.coverImage ? (
                <Image src={story.coverImage} alt={story.title} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center text-3xl">
                  {(() => {
              const MIcon = story.mood ? moodIcon(story.mood) : BookOpen;
              return <MIcon className="w-5 h-5 text-gray-400" strokeWidth={1.5} aria-hidden="true" />;
            })()}
                </div>
              )}
              {/* Gradient overlay ensures the bottom of the image fades cleanly */}
              <div className="absolute inset-0 bg-linear-to-t from-gray-800/80 to-transparent" />
            </div>

            {/* Card body: title, author, reading time, like count */}
            <div className="p-3 flex flex-col gap-1.5 flex-1">
              <h3 className="text-xs font-semibold text-white group-hover:text-red-300 transition-colors line-clamp-2 leading-snug">{story.title}</h3>
              <div className="flex items-center gap-2 mt-auto text-xs text-gray-600">
                <span>{story.author.username}</span>
                <span>·</span>
                <span>{readingTime(story.content)}</span>
                <span className="ml-auto">{story._count.likes}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
