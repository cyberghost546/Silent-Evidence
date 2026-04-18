// app/admin/audit-log/page.tsx — Immutable record of every admin action
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 50;

const ACTION_STYLES: Record<string, string> = {
  BAN_USER: 'text-red-400', UNBAN_USER: 'text-green-400', WARN_USER: 'text-yellow-400',
  SUSPEND_USER: 'text-orange-400', VERIFY_USER: 'text-blue-400',
  DELETE_STORY: 'text-red-400', DELETE_TAG: 'text-gray-400',
  ADD_BANNED_WORD: 'text-orange-400', REMOVE_BANNED_WORD: 'text-gray-400',
  SET_MOOD: 'text-purple-400', CREATE_POLL: 'text-blue-400', DELETE_POLL: 'text-red-400',
  SET_SPOTLIGHT: 'text-yellow-400', CLEAR_SPOTLIGHT: 'text-gray-400',
  UPDATE_FEATURED_AUTHORS: 'text-blue-400',
};

export default async function AdminAuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  const { page: pageParam, action: actionFilter } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));
  const where = actionFilter && actionFilter !== 'all' ? { action: actionFilter } : {};

  const [logs, total, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { admin: { select: { username: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ['action'], _count: { action: true }, orderBy: { _count: { action: 'desc' } } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Audit Log</h1>
      <p className="text-gray-500 text-sm mb-8">Every admin action, in order. This log cannot be deleted.</p>

      {/* Stat */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <p className="text-3xl font-bold text-white">{total.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Total admin actions</p>
      </div>

      {/* Action type filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[{ label: 'All', value: 'all' }, ...actions.map(a => ({ label: `${a.action} (${a._count.action})`, value: a.action }))].map(opt => (
          <a key={opt.value} href={`/admin/audit-log?action=${opt.value}`}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${(actionFilter ?? 'all') === opt.value ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {opt.label}
          </a>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <th className="px-5 py-3">Date</th><th className="px-5 py-3">Admin</th>
            <th className="px-5 py-3">Action</th><th className="px-5 py-3">Detail</th>
            <th className="px-5 py-3">Target</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-800">
            {logs.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-600">No actions logged yet.</td></tr>}
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-800/40 transition">
                <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-5 py-3 text-gray-300 font-medium">{l.admin.username}</td>
                <td className="px-5 py-3"><span className={`text-xs font-bold font-mono ${ACTION_STYLES[l.action] ?? 'text-gray-400'}`}>{l.action}</span></td>
                <td className="px-5 py-3 text-gray-400 max-w-xs truncate text-xs">{l.detail ?? '—'}</td>
                <td className="px-5 py-3 text-xs text-gray-600">{l.targetType ? `${l.targetType} #${l.targetId}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && <a href={`/admin/audit-log?page=${page - 1}${actionFilter ? `&action=${actionFilter}` : ''}`} className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition">← Prev</a>}
          <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && <a href={`/admin/audit-log?page=${page + 1}${actionFilter ? `&action=${actionFilter}` : ''}`} className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition">Next →</a>}
        </div>
      )}
    </div>
  );
}
