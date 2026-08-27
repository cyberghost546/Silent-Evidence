'use client';
// app/admin/rate-limits/page.tsx
//
// WHY 'use client'?
//   This page fetches live data from an API on mount and refreshes on button click.
//   Those interactions require useState and useEffect, which only work in Client Components.
//
// PURPOSE:
//   Shows which IP addresses are hitting which API routes and how many times in the
//   current rate-limit window. Helps the admin identify:
//     - Bots making excessive requests
//     - Users being wrongly throttled
//     - Which routes are under the most traffic
//
// HOW RATE LIMITING WORKS ON THIS SITE:
//   The API middleware tracks (IP + route) combinations in memory (or Redis).
//   Each entry has a request count and a window start time. When a threshold is
//   exceeded, the API returns HTTP 429 Too Many Requests. This page shows those
//   in-flight entries so the admin can manually clear them if needed.
//
// STATE:
//   entries  — the live rate-limit entries from the API
//   total    — total count of entries (for the subtitle)
//   loading  — true during a fetch (shows the skeleton)
//   clearing — the key of the entry being cleared (null when idle)
//              Using a key string (not a boolean) lets us disable only the
//              specific Clear button that was clicked, not all of them.
//
// PATTERN: useCallback + useEffect for manual refresh
//   `load` is wrapped in useCallback so it has a stable reference.
//   The effect calls it once on mount ([] dep array).
//   The Refresh button and the post-clear code call it again manually.
//   This avoids setting up a polling interval that would fire unnecessarily.

import { useEffect, useState, useCallback } from 'react';

// Shape of a single rate-limit entry returned by GET /api/admin/rate-limits
type Entry = {
  key: string;
  ip: string;
  route: string;
  count: number;
  windowStart: string;
  ageSeconds: number;
};

export default function AdminRateLimitsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // null = no clear in progress; 'all' = clearing everything; otherwise = key of the entry being cleared
  const [clearing, setClearing] = useState<string | null>(null);

  // load() fetches the current entries from the API and updates state.
  // useCallback ensures a stable function reference so it can safely be listed
  // as a dependency of the useEffect without causing infinite re-renders.
  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/rate-limits')
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch on mount — empty dep array means this runs once
  useEffect(() => {
    load();
  }, [load]);

  // clearEntry — DELETE a single rate-limit entry by its composite key (IP+route)
  const clearEntry = async (key: string) => {
    setClearing(key); // disable just this row's button
    await fetch('/api/admin/rate-limits', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    setClearing(null);
    load(); // re-fetch to show updated list
  };

  // clearAll — DELETE all entries in the rate-limit store
  const clearAll = async () => {
    // Confirm dialog prevents accidental mass-clear
    if (!confirm('Clear all rate limit entries?')) return;
    setClearing('all'); // disable the "Clear All" button
    await fetch('/api/admin/rate-limits', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setClearing(null);
    load();
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Rate Limit Monitor</h1>
          <p className="text-gray-500 text-sm">{total} active entries in the current window</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 text-sm border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-xl transition"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={clearing === 'all'}
            className="px-3 py-2 text-sm border border-red-800/50 text-red-400 hover:bg-red-600/10 rounded-xl transition disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>No active rate limit entries.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-left">Route</th>
                <th className="px-4 py-3 text-right">Requests</th>
                <th className="px-4 py-3 text-right">Age</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {entries.map((e) => (
                <tr
                  key={e.key}
                  className={`hover:bg-gray-800/30 transition ${e.count > 20 ? 'bg-red-950/10' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{e.ip}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
                      {e.route}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-bold ${e.count > 20 ? 'text-red-400' : e.count > 10 ? 'text-yellow-400' : 'text-white'}`}
                    >
                      {e.count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {e.ageSeconds}s ago
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => clearEntry(e.key)}
                      disabled={clearing === e.key}
                      className="text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-500 hover:border-red-600/50 hover:text-red-400 transition disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
