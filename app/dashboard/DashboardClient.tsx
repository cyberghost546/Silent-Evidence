'use client';
// app/dashboard/DashboardClient.tsx
//
// WHY 'use client'?
//   Fetches data on mount via /api/dashboard, uses Recharts for interactive charts,
//   and manages period toggle state — all of which require browser-side hooks.
//
// PURPOSE:
//   The interactive analytics shell for the author dashboard. Fetches the full
//   DashboardData object from /api/dashboard once on mount and renders:
//     • Animated stat cards (views, likes, followers, tips)
//     • Sparklines (14-day trend miniature charts per stat)
//     • "This month" summary row + writing streak
//     • Line charts (reads, followers) with 7d / 30d period toggle
//     • Daily reads bar chart with best-day star highlight
//     • Top stories horizontal bar chart with Recharts BarChart
//     • Recent comments and tips feed
//     • Quick action links
//
// ANIMATED COUNTERS:
//   `useCountUp(target, duration)` animates numbers from 0 → target using
//   requestAnimationFrame with an ease-out cubic curve. This gives stat cards
//   a satisfying "rolling up" effect on first load.
//
// SPARKLINES:
//   `<Sparkline data={numbers} color="…" />` renders a tiny SVG polyline from
//   the last 14 days. The polyline normalises values to a 24px-tall view box
//   so it always fills vertically regardless of the data range.
//
// PERIOD TOGGLE:
//   `period` ('7d' | '30d') slices the readsPerDay / followersPerDay arrays
//   before passing to Recharts. The toggle button updates local state only —
//   no refetch needed because the full 30-day arrays come down in the initial
//   API response.
//
// WRITING STREAK:
//   Calculated client-side by walking readsPerDay in reverse and counting
//   consecutive days with value > 0. Streak resets on the first zero day.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
type TopStory       = { id: number; title: string; slug: string; views: number; _count: { likes: number; comments: number } };
type ChartDay       = { date: string; reads: number };
type DayPoint       = { date: string; value: number };
type RecentTip      = { id: number; amount: number; createdAt: string; fromUsername: string; message: string | null };
type RecentComment  = { id: number; content: string; createdAt: string; storyTitle: string; storySlug: string; username: string; avatar: string | null };

type DashboardData = {
  totalViews: number; totalLikes: number; totalComments: number; followerCount: number;
  draftCount: number; scheduledCount: number; publishedCount: number;
  tipEarningsCents: number;
  recentTips: RecentTip[];
  topStories: TopStory[];
  viewsChart: ChartDay[]; readsPerDay: DayPoint[]; followersPerDay: DayPoint[];
  readsChange: number | null; followersChange: number | null;
  thisMonthPublished: number; thisMonthFollowers: number; thisMonthReads: number;
  bestDayReads: number;
  recentComments: RecentComment[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }
function shortDate(iso: string) {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

const tooltipStyle = {
  contentStyle: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11, color: '#fff' },
  cursor: { stroke: '#1e293b' },
};

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = Date.now();
    const tick = () => {
      const pct = Math.min((Date.now() - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(eased * target));
      if (pct < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ── Sparkline (tiny SVG polyline from data array) ─────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 60, h = 24;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// ── Change badge ──────────────────────────────────────────────────────────────
function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
      {up ? '+' : ''}{pct}%
    </span>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function IconEye()     { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>; }
function IconHeart()   { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>; }
function IconChat()    { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>; }
function IconUsers()   { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>; }
function IconMoney()   { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>; }
function IconPen()     { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>; }
function IconBook()    { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>; }
function IconGear()    { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>; }
function IconActivity(){ return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>; }
function IconEdit()    { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" /></svg>; }
function IconFire()    { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" /></svg>; }
function IconStar()    { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>; }

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ title, sub, action, children }: { title?: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
      {title && (
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Stat card with animated number + sparkline ────────────────────────────────
function StatCard({ label, value, accent, textColor, icon, change, spark }: {
  label: string; value: number; accent: string; textColor: string;
  icon: React.ReactNode; change?: number | null; spark?: number[];
}) {
  const animated = useCountUp(value);
  const display  = value >= 1000 ? fmt(animated) : String(animated);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${accent} flex items-center justify-center`}>
          <span className={textColor}>{icon}</span>
        </div>
        {spark && <Sparkline data={spark} color={textColor.replace('text-', '#').replace('-400', '')} />}
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{display}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <p className="text-xs text-gray-500">{label}</p>
        <ChangeBadge pct={change ?? null} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardClient() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<'7d' | '30d'>('30d');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="h-20 bg-gray-800 rounded-2xl" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="h-56 bg-gray-800 rounded-2xl" />
          <div className="h-56 bg-gray-800 rounded-2xl" />
        </div>
        <div className="h-52 bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (!data) return <p className="text-red-400 text-sm">Failed to load dashboard data.</p>;

  const tipDollars    = (data.tipEarningsCents / 100).toFixed(2);
  const maxReads      = Math.max(...data.viewsChart.map(d => d.reads), 1);
  const chartData     = period === '7d' ? data.readsPerDay.slice(-7) : data.readsPerDay;
  const followerChart = period === '7d' ? data.followersPerDay.slice(-7) : data.followersPerDay;

  // Sparkline data: last 14 days of readsPerDay
  const readsSpark    = data.readsPerDay.slice(-14).map(d => d.value);
  const followerSpark = data.followersPerDay.slice(-14).map(d => d.value);

  // Writing streak: consecutive days (from today going back) where readsPerDay > 0
  let streak = 0;
  for (let i = data.readsPerDay.length - 1; i >= 0; i--) {
    if (data.readsPerDay[i].value > 0) streak++;
    else break;
  }

  return (
    <div className="space-y-5">

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Views"   value={data.totalViews}    accent="bg-blue-500/10"   textColor="text-blue-400"   icon={<IconEye />}   change={data.readsChange}     spark={readsSpark} />
        <StatCard label="Total Likes"   value={data.totalLikes}    accent="bg-red-500/10"    textColor="text-red-400"    icon={<IconHeart />} />
        <StatCard label="Followers"     value={data.followerCount} accent="bg-purple-500/10" textColor="text-purple-400" icon={<IconUsers />} change={data.followersChange} spark={followerSpark} />
        <StatCard label="Tips Earned"   value={data.tipEarningsCents} accent="bg-green-500/10" textColor="text-green-400" icon={<IconMoney />} />
      </div>

      {/* ── This month + streak summary ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Published this month', value: data.thisMonthPublished, icon: <IconBook />,     color: 'text-gray-300' },
          { label: 'Reads this month',     value: data.thisMonthReads,     icon: <IconEye />,      color: 'text-gray-300' },
          { label: 'New followers',        value: data.thisMonthFollowers, icon: <IconUsers />,    color: 'text-gray-300' },
          { label: 'Day streak',           value: streak,                  icon: <IconFire />,     color: streak > 0 ? 'text-orange-400' : 'text-gray-600' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className={`${color} shrink-0`}>{icon}</span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[11px] text-gray-600 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Story counts ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Published', value: data.publishedCount },
          { label: 'Drafts',    value: data.draftCount     },
          { label: 'Scheduled', value: data.scheduledCount },
        ].map(({ label, value }) => (
          <Link key={label} href="/my-stories"
            className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-3 text-center transition">
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Charts with period toggle ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium">Charts</p>
        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-0.5">
          {(['7d', '30d'] as const).map(p => (
            <button key={p} type="button" onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${period === p ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {p === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card title="Reads" sub={period === '7d' ? 'last 7 days' : 'last 30 days'}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#4b5563' }} tickLine={false} axisLine={false} interval={period === '7d' ? 0 : 6} />
              <YAxis tick={{ fontSize: 9, fill: '#4b5563' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={((v: number) => [v, 'Reads']) as any} />
              <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#ef4444' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="New Followers" sub={period === '7d' ? 'last 7 days' : 'last 30 days'}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={followerChart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#4b5563' }} tickLine={false} axisLine={false} interval={period === '7d' ? 0 : 6} />
              <YAxis tick={{ fontSize: 9, fill: '#4b5563' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={((v: number) => [v, 'Followers']) as any} />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── 7-day bar chart ──────────────────────────────────────────────── */}
      <Card title="Daily Reads" sub="last 7 days">
        <div className="flex items-end gap-2 h-32">
          {data.viewsChart.map(day => {
            const pct = maxReads > 0 ? (day.reads / maxReads) * 100 : 0;
            const isBest = day.reads === data.bestDayReads && day.reads > 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                {day.reads > 0 && (
                  <span className="flex items-center gap-0.5">
                    {isBest && <IconStar />}
                    <span className="text-[10px] text-gray-600">{day.reads}</span>
                  </span>
                )}
                <div
                  className={`w-full rounded-t transition-all duration-500 ${isBest ? 'bg-red-500' : 'bg-red-600/70 hover:bg-red-500'}`}
                  style={{ height: `${Math.max(pct, 3)}%` }}
                  title={`${day.reads} reads — ${shortDate(day.date)}`}
                />
                <span className="text-[9px] text-gray-600 whitespace-nowrap">{shortDate(day.date)}</span>
              </div>
            );
          })}
        </div>
        {data.bestDayReads > 0 && (
          <p className="text-xs text-gray-600 mt-3 flex items-center gap-1">
            <span className="text-yellow-500"><IconStar /></span>
            Best day: <span className="text-gray-400 font-medium">{data.bestDayReads} reads</span>
          </p>
        )}
      </Card>

      {/* ── Author Pro entry points ──────────────────────────────────────────
          Shown to everyone. Each destination does its own Author Pro check and
          shows non-subscribers an upsell, so these links are safe to render
          unconditionally and double as discovery for the plan. */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            href: '/dashboard/analytics',
            title: 'Advanced analytics',
            sub: 'Per-story reads, engagement rate, sales and tips.',
          },
          {
            href: '/dashboard/bundles',
            title: 'Story bundles',
            sub: 'Sell several stories together as one collection.',
          },
          {
            href: '/dashboard/earnings',
            title: 'Earnings & payouts',
            sub: 'Your tips and sales, the platform split, and withdrawals.',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 hover:border-amber-500/50 transition group"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-amber-200 transition">
                {item.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Pro
            </span>
          </Link>
        ))}
      </div>

      {/* ── Top stories ──────────────────────────────────────────────────── */}
      {data.topStories.length > 0 && (
        <Card title="Top Stories" sub="by views">
          <ResponsiveContainer width="100%" height={data.topStories.length * 44}>
            <BarChart
              layout="vertical"
              data={data.topStories.map(s => ({ name: s.title.length > 28 ? s.title.slice(0, 28) + '…' : s.title, views: s.views }))}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#4b5563' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#d1d5db' }} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={((v: number) => [v.toLocaleString(), 'Views']) as any} />
              <Bar dataKey="views" fill="#ef4444" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
            {data.topStories.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700 w-5 text-right shrink-0">{i + 1}</span>
                <Link href={`/story/${s.slug}`} className="flex-1 min-w-0 text-sm text-gray-300 hover:text-white transition truncate">{s.title}</Link>
                <span className="text-xs text-gray-600 shrink-0 flex items-center gap-2">
                  <span className="flex items-center gap-1"><IconEye />{fmt(s.views)}</span>
                  <span className="flex items-center gap-1"><IconHeart />{s._count.likes}</span>
                </span>
                <Link href={`/story/${s.slug}/edit`} className="text-gray-600 hover:text-white transition shrink-0" title="Edit"><IconEdit /></Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Recent comments ───────────────────────────────────────────────── */}
      <Card title="Recent Comments" sub="on your stories"
        action={<Link href="/my-stories" className="text-xs text-gray-600 hover:text-gray-400 transition">View all</Link>}>
        {data.recentComments.length === 0 ? (
          <p className="text-sm text-gray-600">No comments yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {data.recentComments.map(c => (
              <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={c.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.username)}&background=dc2626&color=fff&size=32`}
                    alt={c.username}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="text-xs font-semibold text-white">{c.username}</span>
                  <span className="text-[10px] text-gray-600">on</span>
                  <Link href={`/story/${c.storySlug}`} className="text-[10px] text-gray-500 hover:text-gray-300 transition truncate max-w-[120px]">{c.storyTitle}</Link>
                  <span className="text-[10px] text-gray-700 ml-auto shrink-0">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 pl-7">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Recent tips ───────────────────────────────────────────────────── */}
      <Card title="Recent Tips">
        {data.recentTips.length === 0 ? (
          <p className="text-sm text-gray-600">No tips received yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {data.recentTips.map(tip => (
              <div key={tip.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm text-white">
                    <Link href={`/user/${tip.fromUsername}`} className="font-semibold hover:text-red-400 transition">{tip.fromUsername}</Link>
                    {' '}tipped you
                  </p>
                  {tip.message && <p className="text-xs text-gray-500 italic mt-0.5">"{tip.message}"</p>}
                  <p className="text-xs text-gray-700 mt-0.5">
                    {new Date(tip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-green-400 font-bold text-sm shrink-0">${(tip.amount / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/write',      icon: <IconPen />,      label: 'New Story',  desc: 'Start writing' },
          { href: '/my-stories', icon: <IconBook />,     label: 'My Stories', desc: 'Manage your work' },
          { href: '/settings',   icon: <IconGear />,     label: 'Settings',   desc: 'Edit your profile' },
          { href: '/activity',   icon: <IconActivity />, label: 'Activity',   desc: 'See recent events' },
        ].map(({ href, icon, label, desc }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 rounded-xl transition">
            <span className="text-gray-400 shrink-0">{icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-300">{label}</p>
              <p className="text-[11px] text-gray-600 truncate">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
