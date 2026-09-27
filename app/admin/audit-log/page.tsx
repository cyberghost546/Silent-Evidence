// =============================================================================
// app/admin/audit-log/page.tsx — Immutable Admin Audit Log (Server Component)
// =============================================================================
//
// PURPOSE:
//   Displays a paginated, filterable table of every admin action ever taken on
//   the platform. This record cannot be deleted or altered — it is append-only
//   by design so past administrative decisions are always traceable.
//
// ACCESS CONTROL:
//   This page lives under the /admin layout, which enforces the ADMIN role at
//   the layout level. No extra auth check is needed here.
//
// DATA SOURCES:
//   - prisma.auditLog — the primary log table, ordered newest-first.
//   - Filterable by `action` query param (e.g. ?action=BAN_USER).
//   - Paginated: 50 rows per page, controlled by the `page` query param.
//
// KEY PATTERNS:
//   - Promise.all for parallel DB queries (logs + count + action groupBy).
//   - Server-side pagination via skip/take.
//   - action filter uses query param with "all" as the reset sentinel.
// =============================================================================

import { prisma } from '@/lib/prisma';

// How many log rows to show per page.
// 50 strikes a balance: enough context to spot patterns without overloading the browser.
const PAGE_SIZE = 50;

// Maps each known action string to a Tailwind text-colour class so admins can
// instantly distinguish destructive (red) from safe (green/grey) operations.
// Using `Record<string, string>` makes TypeScript happy with dynamic key access
// while keeping the map exhaustive at a glance.
const ACTION_STYLES: Record<string, string> = {
  BAN_USER: 'text-red-400',
  UNBAN_USER: 'text-green-400',
  WARN_USER: 'text-yellow-400',
  SUSPEND_USER: 'text-orange-400',
  VERIFY_USER: 'text-blue-400',
  DELETE_STORY: 'text-red-400',
  DELETE_TAG: 'text-gray-400',
  ADD_BANNED_WORD: 'text-orange-400',
  REMOVE_BANNED_WORD: 'text-gray-400',
  SET_MOOD: 'text-purple-400',
  CREATE_POLL: 'text-blue-400',
  DELETE_POLL: 'text-red-400',
  SET_SPOTLIGHT: 'text-yellow-400',
  CLEAR_SPOTLIGHT: 'text-gray-400',
  UPDATE_FEATURED_AUTHORS: 'text-blue-400',
};

// `searchParams` is a Promise in Next.js 14 App Router server components —
// it resolves to the parsed query string of the current URL.
// We destructure `page` and `action` from it after awaiting.
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const { page: pageParam, action: actionFilter } = await searchParams;

  // Clamp page to at least 1 — prevents negative skip values if someone
  // manually passes ?page=0 or ?page=-5 in the URL.
  const page = Math.max(1, Number(pageParam ?? 1));

  // Build the Prisma `where` clause:
  // If `actionFilter` is absent or equals 'all', use an empty object (no filter).
  // Otherwise restrict to the specific action string supplied in the URL.
  const where = actionFilter && actionFilter !== 'all' ? { action: actionFilter } : {};

  // ── Parallel DB queries ──────────────────────────────────────────────────
  // Promise.all fires all three queries at the same time instead of sequentially.
  // Doing them serially would add their latencies; in parallel only the slowest
  // one determines the total wait time — typically a 2-3× speed-up here.
  const [logs, total, actions] = await Promise.all([
    // 1. The actual page of log rows, newest first.
    //    `skip` jumps over previous pages; `take` limits to one page's worth.
    //    `include: { admin: { select: { username: true } } }` performs a JOIN on
    //    the User table, pulling only the username column to keep the payload small.
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE, // e.g. page 3 → skip 100 rows
      take: PAGE_SIZE,
      include: {
        admin: { select: { username: true } },
      },
    }),

    // 2. Total matching rows — needed to compute totalPages for the paginator.
    prisma.auditLog.count({ where }),

    // 3. Group by action to build the filter pill list with counts.
    //    `groupBy` is Prisma's equivalent of SQL `GROUP BY action ORDER BY count DESC`.
    //    This gives us [{ action: 'BAN_USER', _count: { action: 42 } }, …]
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    }),
  ]);

  // Integer division (ceiling) gives the total number of pages.
  // Math.ceil ensures a partial last page still counts as a full page.
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Audit Log</h1>
      <p className="text-gray-500 text-sm mb-8">
        Every admin action, in order. This log cannot be deleted.
      </p>

      {/* ── Summary stat card ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        {/* toLocaleString() adds thousands-separator commas for large numbers */}
        <p className="text-3xl font-bold text-white">{total.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Total admin actions</p>
      </div>

      {/* ── Action-type filter pills ── */}
      {/*
        We prepend an "All" option so the user can always reset the filter.
        Each pill is an <a> tag (not a button) so it navigates to a new URL —
        this keeps the filter state in the URL, making it shareable and
        bookmarkable without any client-side state management.
      */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { label: 'All', value: 'all' },
          ...actions.map((a) => ({
            label: `${a.action} (${a._count.action})`,
            value: a.action,
          })),
        ].map((opt) => (
          <a
            key={opt.value}
            href={`/admin/audit-log?action=${opt.value}`}
            // Highlight the active filter pill with a red background;
            // inactive pills use a muted gray with a hover effect.
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              (actionFilter ?? 'all') === opt.value
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {/* ── Log table ── */}
      {/* `overflow-x-auto` allows horizontal scrolling on narrow viewports
          instead of the table breaking the page layout. */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Admin</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Detail</th>
              <th className="px-5 py-3">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {/* Empty state — shown only when no logs match the current filter */}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-600">
                  No actions logged yet.
                </td>
              </tr>
            )}

            {logs.map((l) => (
              // `hover:bg-gray-800/40` — `/40` is Tailwind's opacity modifier,
              // giving a subtle hover highlight without a fully opaque background.
              <tr key={l.id} className="hover:bg-gray-800/40 transition">
                {/* Date formatted as "12 Apr 2025, 14:32" for readability */}
                <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-5 py-3 text-gray-300 font-medium">{l.admin.username}</td>
                <td className="px-5 py-3">
                  {/* Look up the colour for this action, defaulting to gray for unknown types.
                      `font-mono` makes the all-caps action strings easier to scan. */}
                  <span
                    className={`text-xs font-bold font-mono ${ACTION_STYLES[l.action] ?? 'text-gray-400'}`}
                  >
                    {l.action}
                  </span>
                </td>
                {/* `?? '—'` renders an em-dash when the optional detail field is null */}
                <td className="px-5 py-3 text-gray-400 max-w-xs truncate text-xs">
                  {l.detail ?? '—'}
                </td>
                {/* Combine targetType + targetId for a human-readable reference like "USER #42" */}
                <td className="px-5 py-3 text-xs text-gray-600">
                  {l.targetType ? `${l.targetType} #${l.targetId}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination controls ── */}
      {/*
        Only rendered when there is more than one page. Uses plain <a> tags so
        the browser handles navigation — no client-side router needed.
        The action filter is preserved across page turns by appending it to the URL.
      */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {/* Previous arrow — only shown when we're not already on page 1 */}
          {page > 1 && (
            <a
              href={`/admin/audit-log?page=${page - 1}${actionFilter ? `&action=${actionFilter}` : ''}`}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition"
            >
              ← Prev
            </a>
          )}
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {/* Next arrow — only shown when more pages exist */}
          {page < totalPages && (
            <a
              href={`/admin/audit-log?page=${page + 1}${actionFilter ? `&action=${actionFilter}` : ''}`}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
