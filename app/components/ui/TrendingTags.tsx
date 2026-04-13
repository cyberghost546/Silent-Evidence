// TrendingTags.tsx
// Server component — fetches the top 20 tags by story count and renders them
// as a tag cloud. More popular tags get a slightly larger text size.
// Used on the homepage sidebar and the /tags discovery page.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function TrendingTags() {
  // Fetch top 20 published tags ranked by how many published stories use them
  const tags = await prisma.tag.findMany({
    where: { stories: { some: { status: 'PUBLISHED' } } },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { stories: true } },
    },
    orderBy: { stories: { _count: 'desc' } },
    take: 20,
  });

  if (tags.length === 0) return null;

  // Determine the max count so we can normalise sizes relative to it
  const maxCount = tags[0]._count.stories;

  // Map count → one of three size classes for the cloud effect
  const sizeClass = (count: number) => {
    const ratio = maxCount > 0 ? count / maxCount : 0;
    if (ratio >= 0.6) return 'text-base font-semibold';
    if (ratio >= 0.3) return 'text-sm font-medium';
    return 'text-xs font-normal';
  };

  return (
    <section className="max-w-6xl mx-auto px-4 pb-12">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-1 h-5 bg-green-500 rounded-full" />
        <h2 className="text-xl font-bold text-white">Trending Tags</h2>
      </div>

      {/* Tag cloud — flexbox wraps chips naturally */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <Link
            key={tag.id}
            href={`/tag/${tag.slug}`}
            className={`
              inline-flex items-center gap-1.5
              px-3 py-1.5 rounded-full border
              bg-gray-800 border-gray-700
              hover:border-green-500/50 hover:text-green-300 hover:bg-green-500/10
              text-gray-400 transition
              ${sizeClass(tag._count.stories)}
            `}
          >
            <span className="text-gray-600 text-xs">#</span>
            {tag.name}
            {/* Story count badge */}
            <span className="text-[10px] text-gray-600 ml-0.5">{tag._count.stories}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
