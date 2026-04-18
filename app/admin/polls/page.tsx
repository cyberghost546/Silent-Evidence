// app/admin/polls/page.tsx — Create and manage site-wide polls
import { prisma } from '@/lib/prisma';
import PollsClient from './PollsClient';

export default async function AdminPollsPage() {
  const polls = await prisma.poll.findMany({
    where: { groupId: null }, // site-wide polls only
    orderBy: { createdAt: 'desc' },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
      _count: { select: { votes: true } },
    },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Poll Manager</h1>
      <p className="text-gray-500 text-sm mb-8">Create and close site-wide polls. Group polls are managed within each group.</p>
      <PollsClient polls={JSON.parse(JSON.stringify(polls))} />
    </div>
  );
}
