// app/admin/featured-authors/page.tsx
//
// Server Component — reads the current featured-author list from SiteSetting,
// loads the full user records for those IDs, then passes everything to the
// interactive FeaturedAuthorsClient.
//
// PURPOSE:
//   The homepage has an "Authors to Follow" widget that suggests writers to new
//   readers. By default it shows algorithmically chosen authors (most followers, etc.).
//   This page lets the admin manually pin up to 6 specific authors so they always
//   appear — useful for spotlighting new talent or featured creators.
//
// HOW FEATURED AUTHORS ARE STORED:
//   Like verification requests, this uses the SiteSetting key-value store.
//   The setting `'featured_authors'` holds a JSON-serialised number array of user IDs.
//   e.g. `[42, 7, 103]`
//
// TWO-STEP DATA FETCH:
//   Step 1: `findUnique({ key: 'featured_authors' })` → get the JSON array of IDs.
//   Step 2: `user.findMany({ where: { id: { in: ids } } })` → load the actual users.
//   Step 2 is skipped entirely if `ids` is empty (the short-circuit `ids.length > 0`
//   guard) to avoid running `findMany({ where: { id: { in: [] } } })` which would
//   return all users.
//
// `_count` avoids N+1:
//   `_count: { select: { stories: true, followers: true } }` adds story and follower
//   counts to each user in a single query (Prisma generates a LEFT JOIN + subquery).
//   Without this, we'd need a separate count query per user.
//
// The `featured` array is flattened before passing to the client component so the
// client type doesn't have to deal with the nested `_count` shape.

import { prisma } from '@/lib/prisma';
import FeaturedAuthorsClient from './FeaturedAuthorsClient';

export default async function AdminFeaturedAuthorsPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'featured_authors' } });
  const ids: number[] = setting?.value ? JSON.parse(setting.value) : [];

  const featured = ids.length > 0
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, isVerified: true, _count: { select: { stories: true, followers: true } } } })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Featured Authors</h1>
      <p className="text-gray-500 text-sm mb-8">Pin up to 6 authors to always appear in the "Authors to Follow" suggestions.</p>
      <FeaturedAuthorsClient featured={featured.map(u => ({ id: u.id, username: u.username, isVerified: u.isVerified, stories: u._count.stories, followers: u._count.followers }))} />
    </div>
  );
}
