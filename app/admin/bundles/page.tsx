// app/admin/bundles/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminBundlesClient from './AdminBundlesClient';

export default async function AdminBundlesPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') redirect('/');

  const [bundles, allStories] = await Promise.all([
    prisma.storyBundle.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { story: { select: { id: true, title: true, slug: true } } } } },
    }),
    prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true },
      take: 200,
    }),
  ]);

  return (
    <AdminBundlesClient
      initialBundles={JSON.parse(JSON.stringify(bundles))}
      allStories={allStories}
    />
  );
}
