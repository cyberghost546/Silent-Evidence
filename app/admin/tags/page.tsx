// app/admin/tags/page.tsx
//
// Server Component — loads all story tags for the admin tag manager.
//
// PURPOSE:
//   Tags are community labels attached to stories (e.g. "gothic", "haunted-house").
//   This page lets the admin see all tags, how popular each one is, and delete
//   unused ones that would otherwise clutter the tag browse page.
//
// DATA:
//   `orderBy: { stories: { _count: 'desc' } }` sorts by most-used first —
//   the Prisma equivalent of ORDER BY COUNT(*) DESC in SQL. This makes it easy
//   to spot the important tags at the top and the orphaned ones at the bottom.
//   `_count.stories` is included so TagManagerClient can show the story count
//   per tag and prevent deleting tags that still have stories attached.
//
// The data is remapped to a flat { id, name, slug, storyCount } shape before
// being passed as props, which keeps the client component's TypeScript types simple.

import { prisma } from '@/lib/prisma';
import TagManagerClient from './TagManagerClient';

export default async function AdminTagsPage() {
  // Fetch all tags sorted by usage (most popular first).
  // `select` limits the columns to exactly what the UI needs — no extra data transfer.
  const tags = await prisma.tag.findMany({
    orderBy: { stories: { _count: 'desc' } },
    select: { id: true, name: true, slug: true, _count: { select: { stories: true } } },
  });
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Tag Manager</h1>
      <p className="text-gray-500 text-sm mb-8">
        View all tags, how many stories use each, and delete unused ones.
      </p>
      {/*
        Flatten `_count.stories` into `storyCount` so the prop type is a simple
        number rather than a nested Prisma object — cleaner to work with in the
        client component and avoids passing non-serialisable Prisma objects.
      */}
      <TagManagerClient
        tags={tags.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          storyCount: t._count.stories,
        }))}
      />
    </div>
  );
}
