// app/write/sprints/page.tsx
// Server component — lists all active writing sprints.
// Passes current userId (if logged in) to the client-side timer component.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import WritingSprintTimer from '@/app/components/ui/WritingSprintTimer';
import Link from 'next/link';

export const metadata = { title: 'Writing Sprints | Silent Evidence' };

// Revalidate page data every 30 seconds so new sprints appear
export const revalidate = 30;

export default async function SprintsPage() {
  const c      = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  const now    = new Date();

  // Load active sprints that haven't ended, newest first
  const sprints = await prisma.writingSprint.findMany({
    where: { isActive: true, endsAt: { gt: now } },
    orderBy: { startsAt: 'asc' },
    include: {
      participants: {
        select: {
          wordCount: true,
          userId:    true,
          user:      { select: { username: true } },
        },
        orderBy: { wordCount: 'desc' },
      },
    },
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Writing Sprints</h1>
        <p className="text-gray-400 text-sm">
          Join a timed sprint, write as much as you can, and see how you stack up against other horror authors.
        </p>
      </div>

      {/* Sprint list */}
      {sprints.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-semibold text-gray-400 mb-1">No active sprints right now</p>
          <p className="text-sm">Check back soon — sprints are scheduled regularly.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sprints.map(sprint => (
            // Cast the Prisma result shape to the component's expected type
            <WritingSprintTimer
              key={sprint.id}
              sprint={{
                ...sprint,
                startsAt: sprint.startsAt.toISOString(),
                endsAt:   sprint.endsAt.toISOString(),
                participants: sprint.participants as {
                  userId: number;
                  wordCount: number;
                  user: { username: string };
                }[],
              }}
              currentUserId={userId}
            />
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-10">
        <Link href="/write" className="text-sm text-gray-500 hover:text-gray-300 transition">
          ← Back to Write
        </Link>
      </div>
    </main>
  );
}
