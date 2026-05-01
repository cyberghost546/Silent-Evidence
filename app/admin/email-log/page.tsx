// app/admin/email-log/page.tsx
//
// Server Component — paginated history of every email the system has sent.
//
// PURPOSE:
//   The email log table records every outbound email (welcome, password reset,
//   digest, notifications, etc.) along with whether it was delivered ('sent')
//   or failed. This page is the primary debugging tool for email issues:
//   if a user says they didn't receive an email, check here first.
//
// DATA PATTERNS:
//   `groupBy: ['type']` builds the filter pill list — tells us which email
//   types exist and how many of each. This is the Prisma equivalent of
//   SELECT type, COUNT(*) FROM EmailLog GROUP BY type ORDER BY count DESC.
//
//   Three queries run in parallel via Promise.all:
//     1. The current page of log rows (skip/take for pagination)
//     2. Total count (for page math)
//     3. Type groups (for the filter pills)
//   Two more sequential queries fetch the sent/failed counts for the stat cards
//   (they depend on the resolved `where` clause, so they run after Promise.all).
//
// FILTER:
//   `?type=welcome`  — shows only welcome emails
//   `?type=all`      — resets the filter (same as no filter)
//   `where` is built before the queries so both the data query and the count
//   query use the same filter condition.
//
// PAGINATION:
//   50 rows per page (PAGE_SIZE). `skip` and `take` implement OFFSET/LIMIT in SQL.
//   The `page` query param is clamped to at least 1 to prevent negative offsets.

import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 50;

export default async function AdminEmailLogPage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string }> }) {
  const { page: pageParam, type: typeParam } = await searchParams;
  // Clamp to at least 1 — prevents ?page=0 causing a negative skip value
  const page = Math.max(1, Number(pageParam ?? 1));
  // 'all' is the UI sentinel for "no filter" — map it to undefined so Prisma ignores it
  const typeFilter = typeParam && typeParam !== 'all' ? typeParam : undefined;

  // Build the where clause once so both the data query and count use the same filter
  const where = typeFilter ? { type: typeFilter } : {};

  // ── Parallel DB queries ──────────────────────────────────────────────────
  const [logs, total, types] = await Promise.all([
    // The current page of log rows — newest first, offset by previous pages
    prisma.emailLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    // Total matching rows for page math
    prisma.emailLog.count({ where }),
    // All distinct email types with counts — used to build the filter pill list
    prisma.emailLog.groupBy({ by: ['type'], _count: { type: true }, orderBy: { _count: { type: 'desc' } } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  // Sent/failed counts for the summary stat cards at the top
  const sentCount   = await prisma.emailLog.count({ where: { ...where, status: 'sent' } });
  const failedCount = await prisma.emailLog.count({ where: { ...where, status: 'failed' } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Email Log</h1>
      <p className="text-gray-500 text-sm mb-8">Every email the system has sent — useful for debugging delivery issues.</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-2xl font-bold text-white">{total.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Total emails</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-2xl font-bold text-green-400">{sentCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Sent</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-2xl font-bold text-red-400">{failedCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Failed</p>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[{ label: 'All', value: 'all' }, ...types.map(t => ({ label: `${t.type} (${t._count.type})`, value: t.type }))].map(opt => (
          <a key={opt.value} href={`/admin/email-log?type=${opt.value}`}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${(typeParam ?? 'all') === opt.value ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {opt.label}
          </a>
        ))}
      </div>

      {/* Log table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <th className="px-5 py-3">Date</th><th className="px-5 py-3">To</th>
            <th className="px-5 py-3">Subject</th><th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-800">
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-600">No emails logged yet. Email logging starts once the system sends its first email after this update.</td></tr>
            )}
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-800/40 transition">
                <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                <td className="px-5 py-3 text-gray-300 text-xs">{l.to}</td>
                <td className="px-5 py-3 text-gray-300 max-w-xs truncate">{l.subject}</td>
                <td className="px-5 py-3"><span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{l.type}</span></td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${l.status === 'sent' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>{l.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && <a href={`/admin/email-log?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ''}`} className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition">← Prev</a>}
          <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && <a href={`/admin/email-log?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ''}`} className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition">Next →</a>}
        </div>
      )}
    </div>
  );
}
