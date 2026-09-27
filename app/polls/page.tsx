// app/polls/page.tsx — community polls page
// Server component: fetches open polls and passes them + userId to the client.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import PollsClient from './PollsClient';

export const metadata = { title: 'Polls — Silent Evidence' };

export default async function PollsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch community-wide open polls (groupId = null) with option vote counts
  const polls = await prisma.poll.findMany({
    where: {
      groupId: null,
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      question: true,
      endsAt: true,
      createdAt: true,
      author: { select: { username: true, profile: { select: { avatar: true } } } },
      _count: { select: { votes: true } },
      options: {
        select: {
          id: true,
          text: true,
          _count: { select: { votes: true } },
          // Only include the user's own vote record if logged in
          votes: userId ? { where: { userId }, select: { id: true } } : false,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <PollsClient polls={polls as never} userId={userId} />
      </div>
      <Footer />
    </main>
  );
}
