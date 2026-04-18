// app/admin/featured-authors/page.tsx — Pin authors to the "Authors to Follow" widget
import { prisma } from '@/lib/prisma';
import FeaturedAuthorsClient from './FeaturedAuthorsClient';

export default async function AdminFeaturedAuthorsPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'featured_authors' } });
  const ids: number[] = setting ? JSON.parse(setting.value) : [];

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
