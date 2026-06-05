// app/components/ui/RelatedTagsSidebar.tsx
// Server component — shown on story pages below the content.
// For each tag on the current story, queries how many published stories share it,
// then renders each tag as a clickable pill linking to /tag/[slug] with a count badge.
// This helps readers discover more stories in the same thematic space.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';

type Tag = { id: number; name: string; slug: string };

type Props = {
  tags: Tag[];
  currentStoryId: number;
};

export default async function RelatedTagsSidebar({ tags, currentStoryId }: Props) {
  if (tags.length === 0) return null;

  // For each tag, count how many OTHER published stories use it
  const tagCounts = await Promise.all(
    tags.map(async (tag) => {
      const count = await prisma.story.count({
        where: {
          status: 'PUBLISHED',
          id: { not: currentStoryId },
          tags: { some: { id: tag.id } },
        },
      });
      return { ...tag, count };
    })
  );

  // Only show tags that have at least one other story
  const tagsWithStories = tagCounts.filter((t) => t.count > 0);
  if (tagsWithStories.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-1 h-5 bg-red-600 rounded-full" />
        <h3 className="text-base font-bold text-white">Browse by Tag</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {tagsWithStories.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${tag.slug}`}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 hover:border-red-600/60 hover:bg-gray-750 rounded-full transition-all duration-200"
          >
            <span className="text-sm text-gray-300 group-hover:text-red-300 transition-colors">
              #{tag.name}
            </span>
            <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
              {tag.count.toLocaleString()}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
