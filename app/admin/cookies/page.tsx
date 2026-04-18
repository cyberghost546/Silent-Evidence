// app/admin/cookies/page.tsx
// Admin dashboard page showing cookie consent statistics.
// Displays total consents, a breakdown by choice (all / essential / rejected),
// acceptance rate, and a paginated log of the 100 most recent consent records.

import { prisma } from '@/lib/prisma';
import ProgressBar from '@/app/components/ui/ProgressBar';

export default async function AdminCookiesPage() {
  // Fetch all stats in parallel
  const [total, byChoice, recent] = await Promise.all([
    prisma.cookieConsent.count(),
    prisma.cookieConsent.groupBy({
      by: ['choice'],
      _count: { choice: true },
      orderBy: { _count: { choice: 'desc' } },
    }),
    prisma.cookieConsent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        choice: true,
        analytics: true,
        marketing: true,
        ip: true,
        createdAt: true,
      },
    }),
  ]);

  // Build a quick lookup: { all: N, essential: N, rejected: N }
  const counts: Record<string, number> = Object.fromEntries(
    byChoice.map((r) => [r.choice, r._count.choice])
  );

  const acceptedAll = counts['all'] ?? 0;
  const acceptanceRate = total > 0 ? Math.round((acceptedAll / total) * 100) : 0;

  const CHOICE_STYLES: Record<string, { label: string; badge: string }> = {
    all:      { label: 'Accept All',     badge: 'bg-green-500/10 text-green-400 border-green-500/30' },
    essential:{ label: 'Essential Only', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    rejected: { label: 'Rejected',       badge: 'bg-red-500/10 text-red-400 border-red-500/30' },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Cookie Consent</h1>
      <p className="text-gray-500 text-sm mb-8">GDPR consent records — what visitors chose when they saw the cookie banner.</p>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Consents" value={total} color="text-white" />
        <StatCard label="Accepted All"   value={acceptedAll}          color="text-green-400" />
        <StatCard label="Essential Only" value={counts['essential'] ?? 0} color="text-yellow-400" />
        <StatCard label="Rejected"       value={counts['rejected'] ?? 0}  color="text-red-400" />
      </div>

      {/* ── Acceptance rate bar ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white text-sm">Full acceptance rate</h2>
          <span className="text-2xl font-bold text-white">{acceptanceRate}%</span>
        </div>
        <ProgressBar percent={acceptanceRate} color="bg-green-500" height="h-2" />
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── Breakdown by choice ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-white mb-4">Breakdown by choice</h2>
        <div className="space-y-3">
          {['all', 'essential', 'rejected'].map(choice => {
            const count = counts[choice] ?? 0;
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            const style = CHOICE_STYLES[choice];
            return (
              <div key={choice}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{style.label}</span>
                  <span className="text-sm text-white font-semibold">{count} <span className="text-gray-500 font-normal">({pct}%)</span></span>
                </div>
                <ProgressBar
                  percent={pct}
                  color={choice === 'all' ? 'bg-green-500' : choice === 'essential' ? 'bg-yellow-500' : 'bg-red-500'}
                  height="h-1.5"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent consent log ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent consent log</h2>
          <span className="text-xs text-gray-500">Last {recent.length} records</span>
        </div>

        {recent.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No consent records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Choice</th>
                  <th className="pb-3 pr-4">Analytics</th>
                  <th className="pb-3 pr-4">Marketing</th>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recent.map(row => {
                  const style = CHOICE_STYLES[row.choice] ?? CHOICE_STYLES['essential'];
                  return (
                    <tr key={row.id} className="hover:bg-gray-800/50 transition">
                      <td className="py-2.5 pr-4 text-gray-400 whitespace-nowrap text-xs">
                        {new Date(row.createdAt).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${style.badge}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs ${row.analytics ? 'text-green-400' : 'text-gray-600'}`}>
                          {row.analytics ? '✓' : '✕'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs ${row.marketing ? 'text-green-400' : 'text-gray-600'}`}>
                          {row.marketing ? '✓' : '✕'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-500">
                        {row.userId ? `#${row.userId}` : 'Guest'}
                      </td>
                      <td className="py-2.5 text-xs text-gray-600 font-mono">
                        {row.ip ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{label}</p>
    </div>
  );
}
