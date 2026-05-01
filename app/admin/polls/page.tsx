// app/admin/polls/page.tsx
//
// Server Component — admin page for creating and managing site-wide polls.
//
// WHAT ARE POLLS?
//   Polls are mini-surveys embedded on the homepage or in stories. Community members
//   vote on options and see the live results. This admin page covers SITE-WIDE polls
//   (those not attached to a group). Group-specific polls are managed within each group.
//
// DATA QUERY:
//   `where: { groupId: null }` filters to site-wide polls only — group polls
//   have a non-null `groupId` foreign key.
//
//   `options: { include: { _count: { select: { votes: true } } } }` is a nested
//   include with aggregation. It fetches each poll's options AND the vote count
//   for each option — equivalent to:
//     SELECT *, (SELECT COUNT(*) FROM Vote WHERE optionId = o.id) FROM PollOption o
//   This avoids loading every individual Vote row just to count them.
//
//   `take: 20` caps the results to the 20 most recent polls — enough to manage
//   without making the page slow for sites with many old polls.
//
// WHY JSON.parse(JSON.stringify(polls))?
//   Prisma returns Date objects which cannot be serialised across the server→client
//   boundary in Next.js. Passing through JSON converts them to ISO strings.

import { prisma } from '@/lib/prisma';
import PollsClient from './PollsClient';

export default async function AdminPollsPage() {
  const polls = await prisma.poll.findMany({
    where: { groupId: null },          // site-wide polls only
    orderBy: { createdAt: 'desc' },    // newest first
    include: {
      // For each poll, include its options and each option's vote count
      options: { include: { _count: { select: { votes: true } } } },
      // Total vote count across all options for this poll
      _count: { select: { votes: true } },
    },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Poll Manager</h1>
      <p className="text-gray-500 text-sm mb-8">Create and close site-wide polls. Group polls are managed within each group.</p>
      {/* JSON serialisation strips Date objects before crossing server→client boundary */}
      <PollsClient polls={JSON.parse(JSON.stringify(polls))} />
    </div>
  );
}
