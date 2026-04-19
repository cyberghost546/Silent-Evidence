// app/reading-challenge/page.tsx
// Personal reading challenge hub — goal progress, streak, and recent reading history.

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import ReadingGoalWidget from '@/app/components/ui/ReadingGoalWidget';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Reading Challenge | Silent Evidence' };

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default async function ReadingChallengePage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const [streak, history, allTimeCount] = await Promise.all([
    prisma.readingStreak.findUnique({ where: { userId } }),
    prisma.readingHistory.findMany({
      where: { userId },
      orderBy: { readAt: 'desc' },
      take: 20,
      include: {
        story: {
          select: {
            id: true, title: true, slug: true, coverImage: true, mood: true,
            author: { select: { username: true } },
          },
        },
      },
    }),
    prisma.readingHistory.count({ where: { userId } }),
  ]);

  // Build a calendar heatmap for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentReads = await prisma.readingHistory.findMany({
    where: { userId, readAt: { gte: thirtyDaysAgo } },
    select: { readAt: true },
  });

  const dayMap = new Map<string, number>();
  for (const { readAt } of recentReads) {
    const key = readAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }

  // Generate last 30 day keys
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: dayMap.get(key) ?? 0 });
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Hero */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(34,197,94,0.1),transparent_70%)]" />
        <div className="max-w-3xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📚</span>
            <h1 className="text-3xl font-extrabold text-white">Reading Challenge</h1>
          </div>
          <p className="text-gray-400 text-sm">Track your horror reading streak and hit your goals.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Streak + all-time stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Current Streak', value: `${streak?.currentStreak ?? 0}d`, icon: '🔥' },
            { label: 'Best Streak',    value: `${streak?.longestStreak ?? 0}d`, icon: '🏆' },
            { label: 'Stories Read',   value: fmt(allTimeCount),                icon: '📖' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <p className="text-3xl mb-2">{icon}</p>
              <p className="text-2xl font-extrabold text-white">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Reading goal */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Your Goal</h2>
          <ReadingGoalWidget />
        </div>

        {/* 30-day activity heatmap */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Last 30 Days</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex gap-1 flex-wrap">
              {days.map(({ date, count }) => {
                const intensity = count === 0 ? 'bg-gray-800' : count === 1 ? 'bg-green-900' : count <= 3 ? 'bg-green-700' : 'bg-green-500';
                return (
                  <div key={date} title={`${date}: ${count} read`}
                    className={`w-6 h-6 rounded-sm ${intensity} transition-colors`} />
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
              <span>Less</span>
              {['bg-gray-800','bg-green-900','bg-green-700','bg-green-500'].map(c => (
                <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Recent reads */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Recently Read</h2>
          {history.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">👻</p>
              <p>You haven&apos;t read any stories yet.</p>
              <Link href="/discover" className="inline-block mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold text-white transition">
                Explore Stories
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(h => (
                <Link key={h.id} href={`/story/${h.story.slug}`}
                  className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-red-600/30 rounded-2xl p-4 transition group">
                  {h.story.coverImage ? (
                    <img src={h.story.coverImage} alt={h.story.title}
                      className="w-14 h-14 object-cover rounded-xl shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-gray-800 rounded-xl shrink-0 flex items-center justify-center text-2xl">📕</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm group-hover:text-red-300 transition truncate">
                      {h.story.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">by {h.story.author.username}</p>
                    {h.story.mood && (
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider">{h.story.mood}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 shrink-0">
                    {new Date(h.readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
