'use client';
// ============================================================
// FILE: AdminOverviewChart.tsx
// PURPOSE: Grouped bar chart shown at the top of the admin dashboard.
//          Displays three bars per day — new stories, new users, and
//          new comments — so admins can spot spikes and trends at a glance.
//
// LIBRARY USED: Recharts (npm install recharts)
//   Recharts is a React charting library built on SVG. Each chart type
//   (BarChart, AreaChart, etc.) is a component you compose with child
//   components like <Bar>, <XAxis>, <Tooltip>.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   1. Install Recharts: npm install recharts
//   2. Pass an array of { date, stories, users, comments } objects as `data`.
//   3. Change the <Bar dataKey="..."> children to match your own data keys.
//   4. Swap the fill colours to match your brand.
//   5. ResponsiveContainer makes the chart fill its parent's width automatically —
//      always wrap charts in it so they resize on mobile.
// ============================================================

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Each entry in the `data` array represents one calendar day of activity.
// date     — display label shown on the X axis, e.g. "Apr 10"
// stories  — number of new stories published that day
// users    — number of new user registrations that day
// comments — number of comments posted that day
type Day = { date: string; stories: number; users: number; comments: number };

export default function AdminOverviewChart({ data }: { data: Day[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={8} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#f9fafb', fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ color: '#d1d5db' }}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 12 }} />
        <Bar dataKey="stories"  name="Stories"  fill="#dc2626" radius={[3, 3, 0, 0]} />
        <Bar dataKey="users"    name="Users"    fill="#3b82f6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="comments" name="Comments" fill="#10b981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
