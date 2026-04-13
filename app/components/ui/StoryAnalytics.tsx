'use client';
/**
 * StoryAnalytics.tsx
 *
 * WHAT THIS FILE DOES:
 * An author-only collapsible analytics panel shown directly on the story page
 * (below the story content). When expanded it fetches and displays:
 *   - Four stat pills: total views, likes, comments, bookmarks
 *   - A 7-day bar chart showing daily read counts
 *
 * Data is fetched lazily — only when the author clicks to expand the panel.
 * This avoids an unnecessary API call for every visitor who isn't the author.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Create a GET endpoint at /api/[content-type]/[id]/analytics that returns
 *    { views, likes, comments, bookmarks, weeklyChart: [{date, reads}] }.
 * 2. Place <StoryAnalytics storyId={id} /> on any author-only detail page.
 * 3. The bar chart scales each bar relative to the week's maximum — no fixed axis.
 *
 * Example usage:
 *   {isAuthor && <StoryAnalytics storyId={story.id} />}
 */

import { useEffect, useState } from 'react';

// ChartDay — one day's worth of data for the bar chart
type ChartDay = { date: string; reads: number };

// AnalyticsData — the full payload returned by the analytics API
type AnalyticsData = {
  views: number;
  likes: number;
  comments: number;
  bookmarks: number;
  weeklyChart: ChartDay[]; // array of 7 days, oldest first
};

// Props: the story's database ID
type Props = { storyId: number };

// ── dayLabel ─────────────────────────────────────────────────────────────────
// Converts an ISO date string (e.g. "2024-11-05") to a short weekday label
// like "Tue". The T12:00:00Z forces noon UTC so DST can't flip the date.
function dayLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

// ── Pill ──────────────────────────────────────────────────────────────────────
// A small card showing a single metric (icon + number + label).
// Reusable anywhere you need a compact stat display.
function Pill({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex flex-col items-center bg-gray-800 rounded-xl px-4 py-2.5 border border-gray-700">
      <span className="text-base">{icon}</span>
      {/* toLocaleString adds thousands separators: 12345 → "12,345" */}
      <span className="text-lg font-bold text-white">{value.toLocaleString()}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export default function StoryAnalytics({ storyId }: Props) {
  // data — null until the API responds; shows a skeleton while null
  const [data, setData] = useState<AnalyticsData | null>(null);

  // open — controls whether the panel is expanded (collapsed by default)
  const [open, setOpen] = useState(false);

  // ── Lazy fetch: only loads data when the author opens the panel ───────────
  // The dependency array [open, storyId] means: re-run if open flips to true
  // or if storyId changes. The `if (!open) return` guard skips the fetch
  // while the panel is still collapsed.
  useEffect(() => {
    if (!open) return;
    fetch(`/api/stories/${storyId}/analytics`)
      .then((r) => r.json())
      .then(setData)      // setData is called directly as the .then handler
      .catch(() => {});   // silently ignore errors so the page doesn't break
  }, [open, storyId]);

  return (
    <div className="mt-6 border border-dashed border-gray-700 rounded-2xl overflow-hidden">
      {/* Toggle header */}
      <button
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
            // Loading skeleton
            <div className="animate-pulse space-y-3 pt-4">
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-800 rounded-xl" />
                ))}
              </div>
              <div className="h-24 bg-gray-800 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Stat pills */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <Pill icon="👁" label="Views"    value={data.views} />
                <Pill icon="❤️" label="Likes"    value={data.likes} />
                <Pill icon="💬" label="Comments" value={data.comments} />
                <Pill icon="🔖" label="Bookmarks" value={data.bookmarks} />
              </div>

              {/* 7-day bar chart */}
              <div className="mt-5">
                <p className="text-xs text-gray-500 mb-2">Reads this week</p>
                <div className="flex items-end gap-1.5 h-24">
                  {(() => {
                    const max = Math.max(...data.weeklyChart.map((d) => d.reads), 1);
                    return data.weeklyChart.map((day) => {
                      const pct = (day.reads / max) * 100;
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-600">{day.reads || ''}</span>
                          <div
                            className="w-full bg-red-600 rounded-t-sm"
                            style={{ height: `${Math.max(pct, 2)}%` }}
                            title={`${day.reads} reads`}
                          />
                          <span className="text-[10px] text-gray-600">{dayLabel(day.date)}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
