// app/admin/analytics/page.tsx
// Server-rendered admin analytics dashboard.
//
// Requires ADMIN role — non-admins are redirected to the home page.
//
// What it shows:
//   - Four summary stat cards: total users, published stories, comments, views
//   - Two line charts covering the last 14 days: new signups and new stories
//   - A bar chart breaking down stories per category (all time)
//
// All data is fetched directly from the database at request time (no caching),
// so numbers are always up-to-date when the page loads.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SignupsChart, StoriesChart, CategoryChart } from '@/app/components/ui/AnalyticsCharts';

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (me?.role !== 'ADMIN') redirect('/');

  // Last 14 days
  const days: { date: string; stories: number; users: number; comments: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(); start.setDate(start.getDate() - i); start.setHours(0,0,0,0);
    const end   = new Date(start); end.setHours(23,59,59,999);
    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const [stories, users, comments] = await Promise.all([
      prisma.story.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.comment.count({ where: { createdAt: { gte: start, lte: end } } }),
    ]);
    days.push({ date: label, stories, users, comments });
  }

  // Category breakdown
  const categories = await prisma.category.findMany({
    include: { _count: { select: { stories: true } } },
    orderBy: { stories: { _count: 'desc' } },
  });
  const categoryData = categories.map(c => ({ name: c.name, count: c._count.stories }));

  // Totals
  const [totalUsers, totalStories, totalComments, totalViews] = await Promise.all([
    prisma.user.count(),
    prisma.story.count({ where: { status: 'PUBLISHED' } }),
    prisma.comment.count(),
    prisma.story.aggregate({ _sum: { views: true } }),
  ]);

  const stats = [
    { label: 'Total Users',    value: totalUsers.toLocaleString(),                     color: 'text-blue-400' },
    { label: 'Published Stories', value: totalStories.toLocaleString(),               color: 'text-red-400' },
    { label: 'Total Comments', value: totalComments.toLocaleString(),                  color: 'text-red-400' },
    { label: 'Total Views',    value: (totalViews._sum.views ?? 0).toLocaleString(),   color: 'text-orange-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Site Analytics</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center">
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">New Users — Last 14 Days</h2>
          <SignupsChart data={days} />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">New Stories — Last 14 Days</h2>
          <StoriesChart data={days} />
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Stories by Category</h2>
        <CategoryChart data={categoryData} />
      </div>
    </div>
  );
}
