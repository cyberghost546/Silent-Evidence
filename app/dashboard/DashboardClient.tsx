'use client';
// app/dashboard/DashboardClient.tsx
// Author dashboard UI — fetches data from /api/dashboard on mount.
// Shows stat cards, 30-day line charts (reads + followers), top stories bar chart,
// recent tips list, and quick-action links.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

type TopStory  = { id: number; title: string; slug: string; views: number; _count: { likes: number; comments: number } };
type ChartDay  = { date: string; reads: number };       // 7-day bar chart (legacy)
type DayPoint  = { date: string; value: number };        // 30-day line charts
type RecentTip = { id: number; amount: number; createdAt: string; fromUsername: string; message: string | null };

type DashboardData = {
  totalViews:       number;
  totalLikes:       number;
  totalComments:    number;
  followerCount:    number;
  draftCount:       number;
  scheduledCount:   number;
  publishedCount:   number;
  tipEarningsCents: number;
  recentTips:       RecentTip[];
  topStories:       TopStory[];
  viewsChart:       ChartDay[];   // 7-day (kept for reference)
  readsPerDay:      DayPoint[];   // 30-day reads line chart
  followersPerDay:  DayPoint[];   // 30-day followers line chart
};

// Formats large numbers — e.g. 12400 → "12.4k"
function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// Short date label from ISO string — "Mar 28"
function shortDate(iso: string) {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Shared Recharts tooltip style matching the dark site theme
const tooltipStyle = {
  contentStyle: { background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11, color: '#fff' },
  cursor: { stroke: '#1f2937' },
};

export default function DashboardClient() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    // Skeleton placeholders while data loads
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="h-52 bg-gray-800 rounded-2xl" />
          <div className="h-52 bg-gray-800 rounded-2xl" />
        </div>
        <div className="h-48 bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (!data) return <p className="text-red-400">Failed to load dashboard.</p>;

  // Max reads value used to scale the 7-day bar chart bars
  const maxReads = Math.max(...data.viewsChart.map(d => d.reads), 1);
  const tipDollars = (data.tipEarningsCents / 100).toFixed(2);

  return (
    <div className="space-y-6">

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Views',  value: fmt(data.totalViews),    color: 'text-white',       icon: '👁' },
          { label: 'Total Likes',  value: fmt(data.totalLikes),    color: 'text-red-400',     icon: '❤️' },
          { label: 'Followers',    value: fmt(data.followerCount), color: 'text-white',       icon: '👥' },
          { label: 'Tips Earned',  value: `$${tipDollars}`,        color: 'text-green-400',   icon: '💰' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4 hover:border-gray-700 transition">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stat row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Published',  value: data.publishedCount, href: '/my-stories' },
          { label: 'Drafts',     value: data.draftCount,     href: '/my-stories' },
          { label: 'Scheduled',  value: data.scheduledCount, href: '/my-stories' },
        ].map(({ label, value, href }) => (
          <Link key={label} href={href} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-3 text-center transition">
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── 30-day line charts: reads + followers ───────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Reads per day — 30-day line chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">
            Reads <span className="text-gray-500 font-normal text-xs">— last 30 days</span>
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data.readsPerDay} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={((v: number) => [v, 'Reads']) as any} />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* New followers per day — 30-day line chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">
            New Followers <span className="text-gray-500 font-normal text-xs">— last 30 days</span>
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data.followersPerDay} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={((v: number) => [v, 'Followers']) as any} />
              <Line type="monotone" dataKey="value" stroke="#6b7280" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#6b7280' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 7-day bar chart (reads) ─────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Reads — Last 7 Days
        </h2>
        <div className="flex items-end gap-2 h-36">
          {data.viewsChart.map(day => {
            // Bar height proportional to max; minimum 2% so zero is still visible
            const pct = maxReads > 0 ? (day.reads / maxReads) * 100 : 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-600">{day.reads || ''}</span>
                <div
                  className="w-full bg-red-600 rounded-t-sm transition-all duration-500"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                  title={`${day.reads} reads on ${shortDate(day.date)}`}
                />
                <span className="text-[10px] text-gray-600 whitespace-nowrap">{shortDate(day.date)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top stories (horizontal bar chart) ─────────────────────── */}
      {data.topStories.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top Stories by Views</h2>
          <ResponsiveContainer width="100%" height={data.topStories.length * 44}>
            <BarChart
              layout="vertical"
              data={data.topStories.map(s => ({
                name:  s.title.length > 28 ? s.title.slice(0, 28) + '…' : s.title,
                views: s.views,
              }))}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#d1d5db' }} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={((v: number) => [v.toLocaleString(), 'Views']) as any} />
              <Bar dataKey="views" fill="#22c55e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Rank list below chart with edit links */}
          <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
            {data.topStories.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-700 w-5 text-center">{i + 1}</span>
                <Link href={`/story/${s.slug}`} className="flex-1 min-w-0 text-sm text-white hover:text-red-300 transition truncate">
                  {s.title}
                </Link>
                <span className="text-xs text-gray-500 flex-shrink-0">👁 {fmt(s.views)} · ❤️ {s._count.likes}</span>
                <Link href={`/story/${s.slug}/edit`} className="text-xs text-gray-600 hover:text-white transition" title="Edit">✏️</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent tips ─────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Recent Tips</h2>
        {data.recentTips.length === 0 ? (
          <p className="text-sm text-gray-600">No tips received yet.</p>
        ) : (
          <div className="space-y-4">
            {data.recentTips.map(tip => (
              <div key={tip.id} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white">
                    <Link href={`/user/${tip.fromUsername}`} className="font-semibold hover:text-red-400 transition">{tip.fromUsername}</Link>
                    {' '}tipped you
                  </p>
                  {tip.message && <p className="text-xs text-gray-500 italic mt-0.5">"{tip.message}"</p>}
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(tip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-green-400 font-bold text-sm flex-shrink-0">${(tip.amount / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/write',      icon: '✍️', label: 'New Story' },
          { href: '/my-stories', icon: '📚', label: 'My Stories' },
          { href: '/settings',   icon: '⚙️', label: 'Settings' },
          { href: '/activity',   icon: '📜', label: 'Activity' },
        ].map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 py-4 bg-gray-900 border border-gray-800 hover:border-red-600/40 rounded-xl transition text-center"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-medium text-gray-400">{label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}
