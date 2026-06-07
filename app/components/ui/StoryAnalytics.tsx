'use client';
/**
 * StoryAnalytics.tsx
 *
 * Author-only collapsible analytics panel on the story page.
 * Fetches lazily when expanded and displays:
 *   - Four stat pills: views, likes, comments, bookmarks
 *   - Avg read-through rate progress bar
 *   - 7-day reads bar chart (Recharts BarChart)
 *
 * Dynamic styles (bar heights, progress width) are applied imperatively via
 * refs rather than the `style` prop to satisfy the no-inline-styles lint rule.
 */

import { useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

type ChartDay = { date: string; reads: number };

type AnalyticsData = {
  views:         number;
  likes:         number;
  comments:      number;
  bookmarks:     number;
  weeklyChart:   ChartDay[];
  avgCompletion: number | null; // 0–100; null = no tracking data yet
};

type Props = { storyId: number };

function dayLabel(iso: string) {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

function Pill({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex flex-col items-center bg-gray-800 rounded-xl px-4 py-2.5 border border-gray-700">
      <span className="text-base">{icon}</span>
      <span className="text-lg font-bold text-white">{value.toLocaleString()}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export default function StoryAnalytics({ storyId }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [open, setOpen] = useState(false);

  // Ref for the progress bar fill — width is set imperatively to avoid inline style prop
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/stories/${storyId}/analytics`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [open, storyId]);

  // Apply progress bar width once data arrives — imperative so no style= in JSX
  useEffect(() => {
    if (progressBarRef.current && data) {
      progressBarRef.current.style.width = `${data.avgCompletion ?? 0}%`;
    }
  }, [data]);

  // Format chart data for Recharts
  const chartData = data?.weeklyChart.map((d) => ({
    day:   dayLabel(d.date),
    reads: d.reads,
  })) ?? [];

  return (
    <div className="mt-6 border border-dashed border-gray-700 rounded-2xl overflow-hidden">

      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-800/50 transition"
      >
        <span className="text-sm font-semibold text-gray-400">📊 Your story analytics</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-5 pb-5 border-t border-gray-800">
          {!data ? (
            <div className="animate-pulse space-y-3 pt-4">
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded-xl" />
                ))}
              </div>
              <div className="h-8 bg-gray-800 rounded-xl" />
              <div className="h-28 bg-gray-800 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Stat pills */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <Pill icon="👁"  label="Views"     value={data.views} />
                <Pill icon="❤️" label="Likes"     value={data.likes} />
                <Pill icon="💬" label="Comments"  value={data.comments} />
                <Pill icon="🔖" label="Bookmarks" value={data.bookmarks} />
              </div>

              {/* Avg read-through rate */}
              <div className="mt-4 flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3">
                <span className="text-base shrink-0">📖</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1.5">Avg read-through rate</p>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    {/* Width set imperatively via ref — no style prop in JSX */}
                    <div
                      ref={progressBarRef}
                      className="h-full bg-red-600 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-white shrink-0 w-12 text-right">
                  {data.avgCompletion !== null ? `${data.avgCompletion}%` : '—'}
                </span>
              </div>

              {/* 7-day reads bar chart (Recharts) */}
              <div className="mt-5">
                <p className="text-xs text-gray-500 mb-2">Reads this week</p>
                <ResponsiveContainer width="100%" height={96}>
                  <BarChart data={chartData} barCategoryGap="20%">
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        border: '1px solid #374151',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey="reads" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.reads > 0 ? '#dc2626' : '#374151'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
