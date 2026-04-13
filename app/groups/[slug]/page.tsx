// app/groups/[slug]/page.tsx — group detail page
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import GroupDetailClient from './GroupDetailClient';

type Props = { params: Promise<{ slug: string }> };

export default async function GroupPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const group = await prisma.group.findUnique({
    where: { slug },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } },
        orderBy: { joinedAt: 'asc' },
      },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: { select: { id: true, username: true, profile: { select: { avatar: true } } } } },
      },
      polls: {
        where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          author: { select: { username: true } },
          _count: { select: { votes: true } },
          options: {
            select: {
              id: true, text: true,
              _count: { select: { votes: true } },
              votes: userId ? { where: { userId }, select: { id: true } } : false,
            },
          },
        },
      },
      _count: { select: { members: true, posts: true } },
    },
  });

  if (!group) return notFound();

  const membership = group.members.find(m => m.userId === userId);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <GroupDetailClient
        group={JSON.parse(JSON.stringify(group))}
        userId={userId}
        userRole={membership?.role ?? null}
      />
      <Footer />
    </main>
  );
}
