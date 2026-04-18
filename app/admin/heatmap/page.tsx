'use client';
// app/admin/heatmap/page.tsx
// GitHub-style contribution heatmap showing daily signups, stories, and comments
// over the past 52 weeks.

import { useEffect, useState } from 'react';

type Day = { date: string; users: number; stories: number; comments: number; total: number };
type Mode = 'total' | 'users' | 'stories' | 'comments';

function buildGrid(): string[] {
  const days: string[] = [];
  const today = new Date();
  // Go back to the nearest Sunday 52 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
  const cur = new Date(start);
  while (cur <= today) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function cellColor(val: number, max: number, mode: Mode): string {
  if (val === 0 || max === 0) return 'bg-gray-800';
  const pct = val / max;
  if (mode === 'users') {
    if (pct > 0.75) return 'bg-blue-500';
    if (pct > 0.4)  return 'bg-blue-600/70';
    return 'bg-blue-900/60';
  }
  if (mode === 'stories') {
    if (pct > 0.75) return 'bg-purple-500';
    if (pct > 0.4)  return 'bg-purple-600/70';
    return 'bg-purple-900/60';
  }
  if (mode === 'comments') {
    if (pct > 0.75) return 'bg-green-500';
    if (pct > 0.4)  return 'bg-green-600/70';
    return 'bg-green-900/60';
  }
  // total
  if (pct > 0.75) return 'bg-red-500';
  if (pct > 0.4)  return 'bg-red-600/70';
  return 'bg-red-900/60';
}

export default function AdminHeatmapPage() {
  const [counts, setCounts] = useState<Record<string, { users: number; stories: number; comments: number }>>({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode]       = useState<Mode>('total');
  const [tooltip, setTooltip] = useState<Day | null>(null);

  useEffect(() => {
    fetch('/api/admin/heatmap')
      .then(r => r.json())
      .then(d => setCounts(d.counts ?? {}))
      .finally(() => setLoading(false));
  }, []);

  const grid = buildGrid();

  const days: Day[] = grid.map(date => {
    const c = counts[date] ?? { users: 0, stories: 0, comments: 0 };
    return { date, ...c, total: c.users + c.stories + c.comments };
  });

  const maxVal = Math.max(1, ...days.map(d => d[mode]));

  // Group into weeks (columns)
  const weeks: Day[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // Month label positions
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, wi) => {
    const first = week[0];
    if (!first) return;
    const d = new Date(first.date);
    if (d.getDate() <= 7) monthLabels.push({ label: MONTH_LABELS[d.getMonth()], col: wi });
  });

  const totals = days.reduce((acc, d) => ({ users: acc.users + d.users, stories: acc.stories + d.stories, comments: acc.comments + d.comments }), { users: 0, stories: 0, comments: 0 });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Activity Heatmap</h1>
      <p className="text-gray-500 text-sm mb-6">Daily signups, stories, and comments — last 52 weeks</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'New Users',    value: totals.users,    color: 'text-blue-400',   id: 'users' as Mode },
          { label: 'New Stories',  value: totals.stories,  color: 'text-purple-400', id: 'stories' as Mode },
          { label: 'New Comments', value: totals.comments, color: 'text-green-400',  id: 'comments' as Mode },
        ].map(s => (
          <button key={s.id} type="button" onClick={() => setMode(s.id)}
            className={`bg-gray-900 border rounded-xl p-4 text-left transition ${mode === s.id ? 'border-red-600/50' : 'border-gray-800 hover:border-gray-700'}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-4">
        {(['total','users','stories','comments'] as Mode[]).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition capitalize ${mode === m ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}>
            {m}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-32 bg-gray-800 rounded-2xl animate-pulse" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 overflow-x-auto">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 ml-8">
            {weeks.map((_, wi) => {
              const ml = monthLabels.find(m => m.col === wi);
              return <div key={wi} className="w-3 text-[9px] text-gray-600 shrink-0">{ml?.label ?? ''}</div>;
            })}
          </div>

          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {['','M','','W','','F',''].map((d, i) => (
                <div key={i} className="h-3 text-[9px] text-gray-600 leading-3">{d}</div>
              ))}
            </div>
            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${cellColor(day[mode], maxVal, mode)}`}
                    onMouseEnter={() => setTooltip(day)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div className="mt-4 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 inline-block">
              <span className="font-semibold text-white">{tooltip.date}</span>
              {' — '}
              {tooltip.users} signups · {tooltip.stories} stories · {tooltip.comments} comments
            </div>
          )}
        </div>
      )}
    </div>
  );
}
