// app/story-of-day/page.tsx
// Landing page for the "Daily Story" home screen shortcut.
// Shows today's featured story with a full preview card + "Read Now" CTA.
// Also linked from the manifest shortcuts so tapping the long-press shortcut
// on Android opens this page directly.

import { prisma } from '@/lib/prisma';
import { moodIcon } from '@/lib/moodIcons';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: "Today's Story | Silent Evidence" };

// Revalidate once per hour — same story shown all day
export const revalidate = 3600;

// Mood icons come from the shared lib/moodIcons map.

export default async function StoryOfDayPage() {
  // Deterministic daily pick using day-of-year offset
  const now       = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );

  const total = await prisma.story.count({ where: { status: 'PUBLISHED' } });
  const story = total > 0
    ? await prisma.story.findFirst({
        where:   { status: 'PUBLISHED', contentRating: 'ALL' },
        orderBy: { createdAt: 'asc' },
        skip:    dayOfYear % total,
        include: {
          author:   { select: { username: true, profile: { select: { avatar: true } } } },
          category: { select: { name: true, slug: true } },
          _count:   { select: { likes: true, comments: true } },
        },
      })
    : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">Daily Pick</p>
          <h1 className="text-3xl font-bold text-white">Story of the Day</h1>
          <p className="text-sm text-gray-500 mt-1">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {story ? (
          <div className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-900">
            {/* Cover image */}
            {story.coverImage && (
              <div className="relative w-full aspect-video">
                <Image src={story.coverImage} alt={story.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
              </div>
            )}

            <div className="p-6">
              {/* Mood + category */}
              <div className="flex items-center gap-2 mb-3">
                {story.mood && (() => {
                  const MoodIcon = moodIcon(story.mood);
                  return <MoodIcon className="w-5 h-5 text-gray-400" strokeWidth={1.5} aria-hidden="true" />;
                })()}
                <span className="text-xs text-gray-500">{story.category.name}</span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">{story.title}</h2>

              {/* Author */}
              <div className="flex items-center gap-2 mb-4">
                {story.author.profile?.avatar ? (
                  <Image
                    src={story.author.profile.avatar}
                    alt={story.author.username}
                    width={24} height={24}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-xs text-gray-400">{story.author.username[0].toUpperCase()}</span>
                  </div>
                )}
                <span className="text-sm text-gray-400">by {story.author.username}</span>
              </div>

              {/* Excerpt */}
              {story.excerpt && (
                <p className="text-gray-300 text-sm leading-relaxed mb-5">{story.excerpt}</p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                <span>{story._count.likes} likes</span>
                <span>{story._count.comments} comments</span>
                <span>{story.views} views</span>
              </div>

              {/* CTA */}
              <Link
                href={`/story/${story.slug}`}
                className="block w-full text-center py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-sm"
              >
                Read Now →
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <p>No stories yet. Check back soon!</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-center gap-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-white transition">← Browse All</Link>
          <Link href="/discover" className="hover:text-white transition">Discover More →</Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
