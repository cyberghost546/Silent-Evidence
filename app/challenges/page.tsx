// app/challenges/page.tsx
// Lists all writing challenges at /challenges.
//
// A "challenge" is a community writing contest with a specific prompt and date range.
// Any logged-in user can enter by submitting one of their published stories.
// Admins get an extra "New Challenge" button so they can create challenges directly
// from this page without going to the admin dashboard.
//
// Each challenge card shows its current status:
//   - "Upcoming" — the start date hasn't arrived yet
//   - "X days left" — currently active and accepting entries
//   - "Ended" — past the end date, no longer accepting submissions

import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';

export const metadata = { title: 'Story Challenges — Silent Evidence' };

export default async function ChallengesPage() {
  // Check who's viewing so we know whether to show the admin "New Challenge" button
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }) : null;
  const isAdmin = user?.role === 'ADMIN';

  // Fetch all challenges newest-first, with an entry count for each
  const challenges = await prisma.challenge.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { entries: true } } },
  });

  // Capture the current time once so all status calculations use the same moment
  const now = new Date();

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="w-1 h-7 bg-red-600 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-white">Story Challenges</h1>
              <p className="text-sm text-gray-500 mt-0.5">Write for the prompt. Win glory.</p>
            </div>
          </div>
          {isAdmin && (
            <Link href="/admin/challenges/new"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition">
              + New Challenge
            </Link>
          )}
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">✍️</div>
            <h2 className="text-xl font-semibold text-white mb-2">No challenges yet</h2>
            <p className="text-gray-500">Check back soon — challenges are posted monthly.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {challenges.map(c => {
              // A challenge is "active" only if it's been enabled by an admin AND
              // the current time is within the start–end window.
              const isActive = c.active && now >= c.startDate && now <= c.endDate;
              const isEnded  = now > c.endDate;
              // 86400000 ms = 1 day — Math.ceil rounds up so "less than a day" shows as "1d left"
              const daysLeft = Math.ceil((c.endDate.getTime() - now.getTime()) / 86400000);
              return (
                <Link key={c.id} href={`/challenges/${c.id}`}
                  className="group bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-6 transition-all duration-200">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors">{c.title}</h2>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${isEnded ? 'bg-gray-700 text-gray-400' : isActive ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'}`}>
                      {isEnded ? 'Ended' : isActive ? `${daysLeft}d left` : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{c.description}</p>
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">The Prompt</p>
                    <p className="text-sm text-gray-300 italic line-clamp-2">"{c.prompt}"</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📅 {new Date(c.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(c.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>·</span>
                    <span>✍️ {c._count.entries} {c._count.entries === 1 ? 'entry' : 'entries'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
