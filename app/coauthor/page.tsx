// app/coauthor/page.tsx
// Co-author requests board — browse open listings and post your own.
// Server component that loads first page; client component handles interactions.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import CoauthorBoard from './CoauthorBoard';

export const metadata = { title: 'Co-author Requests | Silent Evidence' };

export default async function CoauthorPage() {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;

  // Load first page of open requests server-side for fast initial render
  const requests = await prisma.coauthorRequest.findMany({
    where: { isOpen: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { author: { select: { username: true, profile: { select: { avatar: true } } } } },
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Co-author Requests</h1>
        <p className="text-gray-400 text-sm">
          Looking for a writing partner? Post a request or reach out to another author.
        </p>
      </div>

      {/* Client component handles posting + pagination */}
      <CoauthorBoard
        initialRequests={requests as Parameters<typeof CoauthorBoard>[0]['initialRequests']}
        currentUserId={userId}
      />
    </main>
  );
}
