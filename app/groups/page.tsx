// app/groups/page.tsx — groups discovery page
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import GroupsClient from './GroupsClient';

export const metadata = { title: 'Groups — Silent Evidence' };

export default async function GroupsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const groups = await prisma.group.findMany({
    where: { isPrivate: false },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: {
      id: true, name: true, slug: true, description: true,
      coverImage: true, subgenre: true, isPrivate: true, createdAt: true,
      _count: { select: { members: true, posts: true } },
      members: userId ? { where: { userId }, select: { id: true, role: true } } : false,
    },
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <GroupsClient groups={groups as never} userId={userId} />
      </div>
      <Footer />
    </main>
  );
}
