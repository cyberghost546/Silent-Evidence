// app/components/ui/CreepyOfMonth.tsx
// Server component — finds the story flagged as `creepyOfMonth=true`
// and renders a large featured card on the homepage.
//
// Only one story at a time should have creepyOfMonth=true; the admin sets
// this flag via the story editor. If no story is flagged the component
// returns null and nothing is rendered.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { readingTime } from '@/lib/readingTime';
import { Trophy, Crown, Heart } from 'lucide-react';

// PickOfMonth — highlights the featured "Pick of the Month" story on the homepage.
// Fetches the single published story flagged with creepyOfMonth (DB field kept as-is)
// and renders it as a prominent card with a cover image backdrop and green theming.
export default async function PickOfMonth() {
  // Query the first published story marked as the monthly pick (DB field: creepyOfMonth)
  const story = await prisma.story.findFirst({
    where: { creepyOfMonth: true, status: 'PUBLISHED' },
    include: {
      author:   { select: { username: true, profile: { select: { avatar: true } } } },
      category: { select: { name: true, slug: true } },
      _count:   { select: { likes: true, comments: true } },
    },
  });

  // If no story is flagged, render nothing
  if (!story) return null;

  // Fallback avatar using ui-avatars service with green background to match theme
  const avatar = story.author.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=dc2626&color=fff&size=64`;

  return (
    <section className="max-w-6xl mx-auto px-4 pb-12">
      {/* Section heading with green accent bar and trophy icon */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-1 h-6 bg-green-600 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Pick of the Month</h2>
        <span className="text-xl">🏆</span>
      </div>

      {/* Main card — green-tinted shadow, border glow, and hover lift effect */}
      <div className="relative rounded-2xl overflow-hidden border border-green-600/30 bg-gray-800 shadow-[0_4px_20px_rgba(124,58,237,0.15)] hover:shadow-[0_8px_30px_rgba(124,58,237,0.4)] transition-all duration-300">
        {/* Cover image rendered at low opacity as a background layer */}
        {story.coverImage && (
          <div className="absolute inset-0">
            <img src={story.coverImage} alt="" className="w-full h-full object-cover opacity-20" />
            {/* Gradient overlay fades image toward the left so text remains readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-800/90 to-transparent" />
          </div>
        )}

        {/* Floating green crown badge in the top-right corner */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          👑 Pick of the Month
        </div>

        {/* Card content: category link, title, excerpt, author row, and CTA */}
        <div className="relative p-8 md:p-10 flex flex-col gap-4 max-w-2xl">
          {/* Category pill — links to the category archive */}
          <Link href={`/category/${story.category.slug}`} className="text-xs font-bold uppercase tracking-widest text-green-400 hover:text-green-300 transition w-fit">
            {story.category.name}
          </Link>

          {/* Story title — links to the full story page */}
          <Link href={`/story/${story.slug}`}>
            <h3 className="text-2xl md:text-3xl font-bold text-white hover:text-green-300 transition leading-tight">
              {story.title}
            </h3>
          </Link>

          {/* Optional excerpt shown as a 3-line clamp preview */}
          {story.excerpt && (
            <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">{story.excerpt}</p>
          )}

          {/* Author info row: avatar, username, reading time, and like count */}
          <div className="flex items-center gap-3 mt-1">
            <img src={avatar} alt={story.author.username} className="w-8 h-8 rounded-full border-2 border-green-500/40 object-cover" />
            <span className="text-sm text-gray-300">{story.author.username}</span>
            <span className="text-gray-600">·</span>
            <span className="text-xs text-gray-500">{readingTime(story.content)}</span>
            <span className="text-gray-600">·</span>
            <span className="text-xs text-gray-500 inline-flex items-center gap-0.5"><Heart className="w-3 h-3" /> {story._count.likes}</span>
          </div>

          {/* Call-to-action button — green pill linking to the full story */}
          <Link
            href={`/story/${story.slug}`}
            className="mt-2 w-fit bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
          >
            Read Story →
          </Link>
        </div>
      </div>
    </section>
  );
}
