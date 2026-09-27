// app/admin/stories/page.tsx
// Server component — fetches all stories from the database and passes them to
// AdminStoriesClient, which handles the interactive table (search, status changes, delete).
// Splitting into server + client lets us do the DB query on the server and avoid
// sending an extra API call from the browser.

import { prisma } from '@/lib/prisma';
import AdminStoriesClient from '@/app/components/ui/AdminStoriesClient';

export default async function AdminStoriesPage() {
  // Fetch every story ordered newest-first.
  // We use `select` (not `include`) to fetch only the columns we need — keeps the payload small.
  // _count gives us likes and comments as aggregates without loading every like/comment row.
  const stories = await prisma.story.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      featured: true,
      creepyOfMonth: true,
      createdAt: true,
      author: { select: { username: true } },
      category: { select: { name: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Stories</h1>
      {/* Subtitle shows the total count at a glance */}
      <p className="text-gray-500 text-sm mb-8">{stories.length} total stories</p>
      {/* AdminStoriesClient handles search, filtering, status changes, and delete */}
      <AdminStoriesClient stories={stories} />
    </div>
  );
}
