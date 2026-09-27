// app/admin/page.tsx
// Server component — admin overview dashboard.
// Shows site-wide totals (users, stories, comments), a 7-day activity bar chart,
// and a live feed of the 5 most recent users and stories.
// This page is only reachable via the admin layout, which enforces the ADMIN role.

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AdminOverviewChart from '@/app/components/ui/AdminOverviewChart';
import { Users, BookOpen, MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export default async function AdminOverviewPage() {
  // Fetch all global counts in parallel — Promise.all runs all four DB queries at once
  // instead of waiting for each to finish before starting the next
  const [userCount, storyCount, commentCount, publishedCount] = await Promise.all([
    prisma.user.count(),
    prisma.story.count(),
    prisma.comment.count(),
    prisma.story.count({ where: { status: 'PUBLISHED' } }),
  ]);

  // Build per-day activity data for the last 7 days.
  // We loop from 6 days ago up to today, querying how many stories/users/comments
  // were created each calendar day. This powers the bar chart.
  const days: { date: string; stories: number; users: number; comments: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    // Calculate the start and end of each day (midnight to 23:59:59)
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // Fetch all three counts for this day in parallel
    const [stories, users, comments] = await Promise.all([
      prisma.story.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.comment.count({ where: { createdAt: { gte: start, lte: end } } }),
    ]);
    days.push({ date: label, stories, users, comments });
  }

  // Recent users and stories for the activity feed at the bottom
  const [recentUsers, recentStories] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, username: true, role: true, createdAt: true },
    }),
    prisma.story.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { author: { select: { username: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
      <p className="text-gray-500 text-sm mb-8">
        Welcome back. Here's what's happening on the site.
      </p>

      {/* ── Stat cards — each is a clickable link to the relevant admin section ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total Users"
          value={userCount}
          icon={<Users className="w-6 h-6" />}
          href="/admin/users"
        />
        <StatCard
          label="Total Stories"
          value={storyCount}
          icon={<BookOpen className="w-6 h-6" />}
          href="/admin/stories"
        />
        <StatCard
          label="Published"
          value={publishedCount}
          icon={<BookOpen className="w-6 h-6" />}
          href="/admin/stories"
        />
        <StatCard
          label="Comments"
          value={commentCount}
          icon={<MessageCircle className="w-6 h-6" />}
          href="#"
        />
      </div>

      {/* ── Activity chart — passes the per-day data to a client-side Recharts chart ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-white">Activity — Last 7 Days</h2>
            <p className="text-xs text-gray-500 mt-0.5">New stories, users, and comments per day</p>
          </div>
          <Link
            href="/admin/analytics"
            className="text-xs text-red-400 hover:text-red-300 transition"
          >
            Full analytics →
          </Link>
        </div>
        <AdminOverviewChart data={days} />
      </div>

      {/* ── Recent activity — two columns side by side on large screens ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent users — shows the 5 newest signups with their join date */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Users</h2>
            <Link
              href="/admin/users"
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center text-xs font-bold text-red-400 uppercase">
                    {u.username[0]}
                  </div>
                  <span className="text-sm text-gray-300">{u.username}</span>
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent stories — shows the 5 newest stories with author and publish status */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Stories</h2>
            <Link
              href="/admin/stories"
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentStories.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {/* truncate prevents long titles from breaking the layout */}
                  <p className="text-sm text-gray-300 truncate">{s.title}</p>
                  <p className="text-xs text-gray-600">by {s.author.username}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// StatCard — a clickable summary tile linking to the relevant admin section.
// Accepts any icon from lucide-react and a numeric value to display.
function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-red-600/40 transition group"
    >
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-3xl font-bold text-white group-hover:text-red-400 transition">{value}</p>
      <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{label}</p>
    </Link>
  );
}

// StatusBadge — small coloured pill showing whether a story is PUBLISHED, DRAFT, or ARCHIVED.
// Falls back to the DRAFT style for any unknown status value.
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PUBLISHED: 'bg-red-500/10 text-red-400 border-red-500/30',
    DRAFT: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    ARCHIVED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  };
  return (
    <span
      className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${styles[status] ?? styles.DRAFT}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
