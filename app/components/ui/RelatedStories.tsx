/**
 * RelatedStories.tsx
 *
 * WHAT THIS FILE DOES:
 * A server component that appears at the bottom of a story page and shows up
 * to 3 other published stories from the same category (excluding the one
 * currently being read). Think of it as a "You Might Also Like" recommendation
 * widget — it keeps readers on the site by surfacing relevant content.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Pass the category ID and the current item's ID as props.
 * 2. Adjust `take: 3` to show more or fewer related items.
 * 3. Swap `prisma.story` for whatever model stores your content.
 * 4. Place <RelatedStories categoryId={story.categoryId} currentStoryId={story.id} />
 *    at the bottom of your article / detail page.
 *
 * Example usage (in a Server Component):
 *   <RelatedStories categoryId={42} currentStoryId={7} />
 */

import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Props: the category to match, and the story to exclude from results.
type Props = { categoryId: number; currentStoryId: number; };

// RelatedStories — async server component (runs on the server, no useState/useEffect).
export default async function RelatedStories({ categoryId, currentStoryId }: Props) {
  // Fetch up to 3 published stories in the same category, excluding the current one.
  // `id: { not: currentStoryId }` is a Prisma filter shorthand for "WHERE id != X".
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', categoryId, id: { not: currentStoryId } },
    orderBy: { createdAt: 'desc' }, // newest first
    take: 3,
    select: {
      id: true, title: true, slug: true, coverImage: true, excerpt: true,
      author: { select: { username: true } },
      // _count is a Prisma feature that counts related records without loading them.
      // Here we're counting how many likes each story has.
      _count: { select: { likes: true } },
    },
  });

  // If the category has no other stories, render nothing — avoid an empty section.
  if (stories.length === 0) return null;

  return (
    // Section wrapper — adds a top border and spacing to separate from the story content
    <section className="mt-12 pt-10 border-t border-gray-800">

      {/* Section header — red accent bar + title */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-5 bg-red-600 rounded-full" />
        <h2 className="text-lg font-bold text-white">You Might Also Like</h2>
      </div>

      {/* Responsive 3-column grid — collapses to a single column on small screens */}
      <div className="grid sm:grid-cols-3 gap-4">
        {stories.map((s) => (
          // The whole card is a Next.js Link so the entire area is clickable.
          // `group` on the Link lets child elements respond to the card's hover state.
          <Link
            key={s.id}
            href={`/story/${s.slug}`}
            className="group bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]"
          >
            {/* Cover image area — fixed height of 128px (h-32) */}
            <div className="h-32 overflow-hidden">
              {s.coverImage ? (
                // group-hover:scale-105 zooms the image slightly when the card is hovered
                <img src={s.coverImage} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                // Fallback: dark gradient with a book icon when no cover image is set
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
            </div>

            {/* Card text body */}
            <div className="p-3">
              {/* Story title — turns red on hover via group-hover; line-clamp-2 prevents overflow */}
              <p className="text-sm font-semibold text-white group-hover:text-red-300 transition line-clamp-2 leading-snug">{s.title}</p>
              {/* Author username and like count in a subtle meta line */}
              <p className="text-xs text-gray-500 mt-1">{s.author.username} · ♥ {s._count.likes}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
