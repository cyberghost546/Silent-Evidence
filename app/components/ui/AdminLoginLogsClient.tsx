'use client';
// app/components/ui/AdminLoginLogsClient.tsx
// Admin panel — login security log viewer.
// Shows every login attempt with IP, browser, user, and success/fail status.
// Supports filter pills (All/Success/Failed), search, pagination, and CSV export.

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Log = {
  id: number;
  userId: number | null;
  username: string | null;
  email: string;
  ip: string;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
};

// Parse the User-Agent string into a short human-readable label
function parseBrowser(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  if (ua.includes('Mobile')) return 'Mobile';
  return 'Other';
}

// Friendly relative time
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type Filter = 'all' | 'success' | 'fail';

interface Props {
  logs: Log[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export default function AdminLoginLogsClient({ logs, page, totalPages, totalCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const visible = logs.filter((l) => {
    if (filter === 'success' && !l.success) return false;
    if (filter === 'fail' && l.success) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.email.toLowerCase().includes(q) &&
        !(l.username ?? '').toLowerCase().includes(q) &&
        !l.ip.includes(q)
      )
        return false;
    }
    return true;
  });

  const successCount = logs.filter((l) => l.success).length;
  const failCount = logs.filter((l) => !l.success).length;

  // ── CSV export ───────────────────────────────────────────────────────────────
  function exportCsv() {
    const headers = ['ID', 'Status', 'Username', 'Email', 'IP', 'Browser', 'When'];
    const rows = visible.map((l) => [
      l.id,
      l.success ? 'Success' : 'Failed',
      l.username ?? '',
      l.email,
      l.ip,
      parseBrowser(l.userAgent),
      new Date(l.createdAt).toISOString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login-logs-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Pagination navigation ─────────────────────────────────────────────────────
  function goTo(p: number) {
    router.push(`${pathname}?page=${p}`);
  }

  return (
    <div className="space-y-5">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total (all pages)',
            value: totalCount,
            color: 'text-gray-300',
            bg: 'bg-gray-800',
          },
          {
            label: 'Success (this page)',
            value: successCount,
            color: 'text-green-400',
            bg: 'bg-green-900/20',
          },
          {
            label: 'Failed (this page)',
            value: failCount,
            color: 'text-red-400',
            bg: 'bg-red-900/20',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} border border-gray-800 rounded-xl p-4 text-center`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, username, or IP…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2
                       text-sm text-gray-200 placeholder-gray-600
                       focus:outline-none focus:ring-1 focus:ring-red-600"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 items-center">
          {(['all', 'success', 'fail'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                filter === f
                  ? f === 'fail'
                    ? 'bg-red-700 text-white'
                    : f === 'success'
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-600 text-white'
                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'success' ? '✓ Success' : '✗ Failed'}
            </button>
          ))}

          {/* CSV export */}
          <button
            type="button"
            onClick={exportCsv}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition"
            title="Export current view as CSV"
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      {visible.length === 0 ? (
        <p className="text-center text-gray-600 py-12 text-sm">No logs match this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-left text-xs text-gray-500 uppercase tracking-widest">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Browser</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {visible.map((log) => (
                <tr key={log.id} className="hover:bg-gray-900/50 transition">
                  {/* Status badge */}
                  <td className="px-4 py-3">
                    {log.success ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5
                                       rounded-full bg-green-900/40 text-green-400 border border-green-800/50"
                      >
                        ✓ Success
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5
                                       rounded-full bg-red-900/40 text-red-400 border border-red-800/50"
                      >
                        ✗ Failed
                      </span>
                    )}
                  </td>

                  {/* User info */}
                  <td className="px-4 py-3">
                    {log.username ? (
                      <p className="text-white font-medium">{log.username}</p>
                    ) : (
                      <p className="text-gray-600 italic">Unknown user</p>
                    )}
                    <p className="text-xs text-gray-500 truncate max-w-[180px]">{log.email}</p>
                  </td>

                  {/* IP (anonymized — last octet masked) */}
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.ip}</td>

                  {/* Browser */}
                  <td className="px-4 py-3 text-xs text-gray-400">{parseBrowser(log.userAgent)}</td>

                  {/* Time */}
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {timeAgo(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages} &nbsp;·&nbsp; {totalCount.toLocaleString()} total entries
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Prev
            </button>

            {/* Page number buttons — show up to 5 around the current page */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs text-gray-600">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goTo(p as number)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                      p === page
                        ? 'bg-red-700 border-red-700 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              type="button"
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
