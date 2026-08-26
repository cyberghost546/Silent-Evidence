'use client';
/**
 * app/admin/heatmap/page.tsx
 *
 * PURPOSE:
 *   GitHub-style contribution heatmap showing daily signups, new stories, and
 *   new comments over the previous 52 weeks (364 days). Each calendar day is
 *   rendered as a tiny coloured square; darker = more activity.
 *
 * ACCESS CONTROL:
 *   'use client' — this is a Client Component. Access is enforced by the admin
 *   layout (app/admin/layout.tsx) on the server before React ever renders this
 *   component. No auth checks are needed here.
 *
 * DATA SOURCES:
 *   GET /api/admin/heatmap — returns { counts: Record<"YYYY-MM-DD", { users, stories, comments }> }
 *   Data is fetched once on mount via useEffect; no real-time updates.
 *
 * KEY PATTERNS:
 *   - Grid built entirely in JS from a date sequence (buildGrid)
 *   - Four display modes (total/users/stories/comments) drive both colour
 *     logic and the summary card highlights
 *   - Tooltip is hover-only (mouse enter/leave), not a real DOM popover
 *   - Colour intensity is percentage-based: val/max bucketed into three tiers
 */

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

// Day represents one calendar date with its activity counts and computed total
type Day = { date: string; users: number; stories: number; comments: number; total: number };

// Mode controls which metric's colour scale is shown on the heatmap
type Mode = 'total' | 'users' | 'stories' | 'comments';

// ---------------------------------------------------------------------------
// Grid builder
// ---------------------------------------------------------------------------

/**
 * buildGrid
 * Produces an array of ISO date strings ("YYYY-MM-DD") covering the 52-week
 * window ending today. The grid always starts on a Sunday so the weekly columns
 * align with standard calendar weeks (matching GitHub's contribution graph layout).
 *
 * Algorithm:
 *   1. Go back 364 days from today (52 × 7).
 *   2. Rewind further to the previous Sunday (getDay() === 0).
 *   3. Iterate day by day until we reach today.
 */
function buildGrid(): string[] {
  const days: string[] = [];
  const today = new Date();

  // Step 1: go back 364 days
  const start = new Date(today);
  start.setDate(start.getDate() - 364);

  // Step 2: rewind to Sunday — getDay() returns 0 (Sun) through 6 (Sat)
  start.setDate(start.getDate() - start.getDay());

  // Step 3: fill every day up to and including today
  const cur = new Date(start);
  while (cur <= today) {
    // slice(0, 10) extracts "YYYY-MM-DD" from the full ISO string
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Abbreviated month names used for the column header labels
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// ---------------------------------------------------------------------------
// Colour helper
// ---------------------------------------------------------------------------

/**
 * cellColor
 * Maps a numeric value to a Tailwind background colour class. The intensity is
 * computed as a percentage of the maximum value seen across all days for the
 * current mode. Three tiers: >75% = bright, >40% = mid, else = dim.
 *
 * Each mode has its own colour family:
 *   users    → blue
 *   stories  → purple
 *   comments → green
 *   total    → red (the site's brand colour)
 *
 * Returns 'bg-gray-800' for zero-value cells so they appear as empty squares.
 */
function cellColor(val: number, max: number, mode: Mode): string {
  // Zero values (or a max of zero) always render as the empty grey square
  if (val === 0 || max === 0) return 'bg-gray-800';

  // Normalise the value to a 0–1 percentage relative to the max day
  const pct = val / max;

  if (mode === 'users') {
    if (pct > 0.75) return 'bg-blue-500';
    if (pct > 0.4) return 'bg-blue-600/70'; // /70 = 70% opacity for a softer mid-tone
    return 'bg-blue-900/60';
  }
  if (mode === 'stories') {
    if (pct > 0.75) return 'bg-purple-500';
    if (pct > 0.4) return 'bg-purple-600/70';
    return 'bg-purple-900/60';
  }
  if (mode === 'comments') {
    if (pct > 0.75) return 'bg-green-500';
    if (pct > 0.4) return 'bg-green-600/70';
    return 'bg-green-900/60';
  }
  // Default: 'total' mode uses red (brand colour)
  if (pct > 0.75) return 'bg-red-500';
  if (pct > 0.4) return 'bg-red-600/70';
  return 'bg-red-900/60';
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AdminHeatmapPage() {
  // counts: API response — a map from date string to { users, stories, comments }
  const [counts, setCounts] = useState<
    Record<string, { users: number; stories: number; comments: number }>
  >({});
  const [loading, setLoading] = useState(true);
  // mode: which metric to visualise; drives both colour logic and summary cards
  const [mode, setMode] = useState<Mode>('total');
  // tooltip: the Day object for the currently hovered cell (null = no tooltip shown)
  const [tooltip, setTooltip] = useState<Day | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching — runs once on mount (empty dependency array)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetch('/api/admin/heatmap')
      .then((r) => r.json())
      .then((d) => setCounts(d.counts ?? {})) // fallback to empty object if API fails
      .finally(() => setLoading(false)); // always hide loading state
  }, []);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  // Full ordered list of date strings covering the 52-week window
  const grid = buildGrid();

  // Merge the API counts into the grid, defaulting missing dates to zero
  const days: Day[] = grid.map((date) => {
    const c = counts[date] ?? { users: 0, stories: 0, comments: 0 };
    // Compute the 'total' property as the sum of all three metrics
    return { date, ...c, total: c.users + c.stories + c.comments };
  });

  // maxVal: used to normalise intensities; Math.max(1, ...) prevents division by zero
  const maxVal = Math.max(1, ...days.map((d) => d[mode]));

  // Chunk the flat day array into weekly slices (7 days each) to form grid columns
  const weeks: Day[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // Month labels: placed above the first week that falls within each new month.
  // A week "belongs" to a month if its first day falls within the first 7 days
  // of that month (d.getDate() <= 7), which avoids duplicate labels.
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, wi) => {
    const first = week[0];
    if (!first) return;
    const d = new Date(first.date);
    if (d.getDate() <= 7) monthLabels.push({ label: MONTH_LABELS[d.getMonth()], col: wi });
  });

  // 52-week totals for the summary stat cards at the top
  const totals = days.reduce(
    (acc, d) => ({
      users: acc.users + d.users,
      stories: acc.stories + d.stories,
      comments: acc.comments + d.comments,
    }),
    { users: 0, stories: 0, comments: 0 }
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Activity Heatmap</h1>
      <p className="text-gray-500 text-sm mb-6">
        Daily signups, stories, and comments — last 52 weeks
      </p>

      {/* ── Summary stat cards ── */}
      {/* Clicking a card also switches the active heatmap mode */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'New Users', value: totals.users, color: 'text-blue-400', id: 'users' as Mode },
          {
            label: 'New Stories',
            value: totals.stories,
            color: 'text-purple-400',
            id: 'stories' as Mode,
          },
          {
            label: 'New Comments',
            value: totals.comments,
            color: 'text-green-400',
            id: 'comments' as Mode,
          },
        ].map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setMode(s.id)} // switch heatmap view to this metric
            className={`bg-gray-900 border rounded-xl p-4 text-left transition ${
              // Highlight the active card with a red border accent
              mode === s.id ? 'border-red-600/50' : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Mode selector tabs ── */}
      {/* 'total' is an additional tab not shown in the stat cards above */}
      <div className="flex gap-2 mb-4">
        {(['total', 'users', 'stories', 'comments'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition capitalize ${
              mode === m
                ? 'bg-red-600 border-red-600 text-white' // active tab
                : 'border-gray-700 text-gray-400 hover:text-white' // inactive tab
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* ── Heatmap grid ── */}
      {loading ? (
        // Skeleton placeholder while the API response is in-flight
        <div className="h-32 bg-gray-800 rounded-2xl animate-pulse" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 overflow-x-auto">
          {/* Month header row — one label per column, positioned absolutely by col index */}
          {/* gap-[3px] matches the cell gap below so labels align with their columns */}
          <div className="flex gap-[3px] mb-1 ml-8">
            {weeks.map((_, wi) => {
              // Find a month label entry for this column (undefined if none)
              const ml = monthLabels.find((m) => m.col === wi);
              return (
                <div key={wi} className="w-3 text-[9px] text-gray-600 shrink-0">
                  {/* Render the month abbreviation if this column starts a new month */}
                  {ml?.label ?? ''}
                </div>
              );
            })}
          </div>

          {/* Main grid: day-of-week labels + weekly columns */}
          <div className="flex gap-[3px]">
            {/* Day-of-week labels: only Mon (M), Wed (W), Fri (F) are labelled
                to match the GitHub contribution graph convention */}
            <div className="flex flex-col gap-[3px] mr-1">
              {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
                <div key={i} className="h-3 text-[9px] text-gray-600 leading-3">
                  {d}
                </div>
              ))}
            </div>

            {/* Weekly columns — each is a vertical stack of 7 day cells */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    // cellColor computes the correct Tailwind class for this cell
                    className={`w-3 h-3 rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${cellColor(day[mode], maxVal, mode)}`}
                    // Store the hovered day in state to drive the tooltip
                    onMouseEnter={() => setTooltip(day)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* ── Hover tooltip ── */}
          {/* Only rendered when a cell is being hovered; positioned below the grid */}
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
