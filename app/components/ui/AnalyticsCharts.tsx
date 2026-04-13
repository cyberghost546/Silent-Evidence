'use client';
// ============================================================
// FILE: AnalyticsCharts.tsx
// PURPOSE: Three separate named chart exports used on the admin analytics page.
//
//   SignupsChart  — area chart showing new user registrations per day
//   StoriesChart  — area chart showing new story submissions per day
//   CategoryChart — horizontal bar chart showing story counts per category
//
// LIBRARY USED: Recharts (npm install recharts)
//   Recharts is a React charting library. Each chart type is a component you
//   compose with children — e.g. <AreaChart> wraps <Area>, <XAxis>, <Tooltip>.
//
// KEY CONCEPT — SVG gradient fills:
//   The <defs><linearGradient> block inside each AreaChart defines a vertical
//   colour gradient (top = coloured, bottom = transparent). The gradient id
//   is referenced by fill="url(#gradientId)" on the <Area> element.
//   This makes area charts look polished without any extra CSS.
//
// KEY CONCEPT — layout="vertical" for CategoryChart:
//   By default BarChart draws vertical bars. Setting layout="vertical" rotates
//   the chart so the bars go left-to-right, which is better for long category
//   names. The XAxis and YAxis types swap (number vs category) accordingly.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   1. npm install recharts
//   2. Import whichever chart(s) you need — they're named exports.
//   3. Pass data arrays matching the DayData or CategoryData types.
//   4. Wrap each chart in <ResponsiveContainer> so it fills its parent's width.
//   5. Swap fill colours and gradients to match your brand.
// ============================================================

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// One entry per day — used by SignupsChart and StoriesChart
type DayData = { date: string; stories: number; users: number; comments: number };
// One entry per category — used by CategoryChart
type CategoryData = { name: string; count: number };

// Area chart — daily new-user signups, filled with a red gradient
export function SignupsChart({ data }: { data: DayData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="users" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
        <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="users" stroke="#ef4444" fill="url(#users)" strokeWidth={2} name="New users" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Area chart — daily new story submissions, filled with an orange gradient
export function StoriesChart({ data }: { data: DayData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="stories" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
        <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="stories" stroke="#f97316" fill="url(#stories)" strokeWidth={2} name="New stories" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Horizontal bar chart — story count per category, ranked from most to least
export function CategoryChart({ data }: { data: CategoryData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} width={120} />
        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Stories" />
      </BarChart>
    </ResponsiveContainer>
  );
}
