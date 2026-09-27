// WriterOfMonth.tsx
// Server component — fetches the user with writerOfMonth=true and renders
// a cinematic spotlight banner on the homepage/leaderboard.

import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { cache, TTL } from '@/lib/cache';
import { PenLine, Crown, Heart } from 'lucide-react';

export default async function WriterOfMonth() {
  // Cached 1 hour — writer of the month changes at most once a month.
  const writer = await cache('homepage:writer-of-month', TTL.LONG, () =>
    prisma.user.findFirst({
      where: { writerOfMonth: true },
      select: {
        id: true,
        username: true,
        profile: { select: { avatar: true, bio: true } },
        _count: { select: { stories: true } },
        stories: {
          where: { status: 'PUBLISHED' },
          orderBy: { likes: { _count: 'desc' } },
          take: 3,
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            _count: { select: { likes: true } },
          },
        },
      },
    })
  );

  if (!writer) return null;

  // Build avatar URL — fallback to initials avatar if none set
  const avatar =
    writer.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(writer.username)}&background=dc2626&color=fff&size=128`;

  return (
    <section className="max-w-6xl mx-auto px-4 pb-14">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-1 h-6 bg-yellow-400 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Writer of the Month</h2>
        <PenLine className="w-6 h-6 text-yellow-400" />
      </div>

      {/* Spotlight card */}
      <div className="relative rounded-2xl overflow-hidden border border-yellow-600/30 bg-gray-900 shadow-[0_4px_40px_rgba(234,179,8,0.15)]">
        {/* Radial glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(234,179,8,0.08)_0%,_transparent_60%)] pointer-events-none" />

        {/* Crown banner */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-bold px-3 py-1.5 rounded-full">
          <Crown className="w-3.5 h-3.5" /> Writer of the Month
        </div>

        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-start gap-8">
          {/* Avatar + info */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {/* Glowing avatar ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-yellow-500/30 blur-lg scale-110" />
              <Image
                src={avatar}
                alt={writer.username}
                width={96}
                height={96}
                className="relative rounded-full object-cover border-4 border-yellow-500/50"
              />
            </div>
            <div className="text-center">
              <Link
                href={`/user/${writer.username}`}
                className="font-bold text-white text-lg hover:text-yellow-300 transition"
              >
                {writer.username}
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">
                {writer._count.stories} stories published
              </p>
            </div>
          </div>

          {/* Bio + top stories */}
          <div className="flex-1 min-w-0">
            {writer.profile?.bio && (
              <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-2 italic">
                "{writer.profile.bio}"
              </p>
            )}

            {/* Top 3 stories */}
            {writer.stories.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Top Stories</p>
                <div className="flex flex-col gap-2">
                  {writer.stories.map((story, i) => (
                    <Link
                      key={story.id}
                      href={`/story/${story.slug}`}
                      className="flex items-center gap-3 group"
                    >
                      {/* Rank number */}
                      <span className="text-yellow-500 font-extrabold text-sm w-5 flex-shrink-0">
                        #{i + 1}
                      </span>
                      {/* Tiny thumbnail */}
                      {story.coverImage && (
                        <Image
                          src={story.coverImage}
                          alt={story.title}
                          width={40}
                          height={40}
                          className="rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-sm text-gray-300 group-hover:text-yellow-300 transition line-clamp-1">
                        {story.title}
                      </span>
                      <span className="ml-auto text-xs text-gray-500 flex-shrink-0 inline-flex items-center gap-0.5">
                        <Heart className="w-3 h-3" /> {story._count.likes}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link
              href={`/user/${writer.username}`}
              className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-yellow-400 hover:gap-3 transition-all"
            >
              View full profile →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
