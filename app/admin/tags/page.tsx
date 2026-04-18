// app/admin/tags/page.tsx — Tag manager: view all tags, story counts, delete unused
import { prisma } from '@/lib/prisma';
import TagManagerClient from './TagManagerClient';

export default async function AdminTagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { stories: { _count: 'desc' } },
    select: { id: true, name: true, slug: true, _count: { select: { stories: true } } },
  });
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Tag Manager</h1>
      <p className="text-gray-500 text-sm mb-8">View all tags, how many stories use each, and delete unused ones.</p>
      <TagManagerClient tags={tags.map(t => ({ id: t.id, name: t.name, slug: t.slug, storyCount: t._count.stories }))} />
    </div>
  );
}
