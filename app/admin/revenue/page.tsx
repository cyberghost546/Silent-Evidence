// app/admin/revenue/page.tsx — Financial overview: tips, subscriptions, purchases
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

function cents(n: number) { return `$${(n / 100).toFixed(2)}`; }

export default async function AdminRevenuePage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalTips, monthTips, lastMonthTips,
    subCount, activeSubs,
    storyPurchases, bundlePurchases, chapterPurchases,
    recentTips, topTipped,
  ] = await Promise.all([
    prisma.tip.aggregate({ _sum: { amount: true } }),
    prisma.tip.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.tip.aggregate({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.storyPurchase.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.bundlePurchase.aggregate({ _sum: { paidCents: true }, _count: true }),
    prisma.chapterPurchase.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.tip.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { from: { select: { username: true } }, to: { select: { username: true } } } }),
    prisma.tip.groupBy({ by: ['toUserId'], _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 5 }),
  ]);

  const allTimeRevenue =
    (totalTips._sum.amount ?? 0) +
    (storyPurchases._sum.amount ?? 0) +
    (bundlePurchases._sum.paidCents ?? 0) +
    (chapterPurchases._sum.amount ?? 0);

  const topTippedUsers = await Promise.all(
    topTipped.map(async t => {
      const u = await prisma.user.findUnique({ where: { id: t.toUserId }, select: { username: true } });
      return { username: u?.username ?? '?', total: t._sum.amount ?? 0 };
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Revenue Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">Tips, subscriptions, and purchases across the platform.</p>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="All-Time Revenue" value={cents(allTimeRevenue)} color="text-green-400" />
        <StatCard label="Tips This Month" value={cents(monthTips._sum.amount ?? 0)} color="text-yellow-400" sub={`Last month: ${cents(lastMonthTips._sum.amount ?? 0)}`} />
        <StatCard label="Active Subscribers" value={String(activeSubs)} color="text-blue-400" sub={`${subCount} total`} />
        <StatCard label="Story Purchases" value={String(storyPurchases._count)} color="text-purple-400" sub={cents(storyPurchases._sum.amount ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Revenue by Source</h2>
          <div className="space-y-3">
            {[
              { label: 'Tips', amount: totalTips._sum.amount ?? 0, color: 'bg-yellow-500' },
              { label: 'Story Purchases', amount: storyPurchases._sum.amount ?? 0, color: 'bg-purple-500' },
              { label: 'Bundle Purchases', amount: bundlePurchases._sum.paidCents ?? 0, color: 'bg-blue-500' },
              { label: 'Chapter Purchases', amount: chapterPurchases._sum.amount ?? 0, color: 'bg-pink-500' },
            ].map(({ label, amount, color }) => {
              const pct = allTimeRevenue > 0 ? Math.round((amount / allTimeRevenue) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{label}</span>
                    <span className="text-white font-semibold">{cents(amount)} <span className="text-gray-500 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top tipped authors */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Top Tipped Authors</h2>
          <div className="space-y-3">
            {topTippedUsers.map((u, i) => (
              <div key={u.username} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-600 w-5">#{i + 1}</span>
                  <Link href={`/user/${u.username}`} className="text-sm text-gray-300 hover:text-white transition">{u.username}</Link>
                </div>
                <span className="text-sm font-semibold text-yellow-400">{cents(u.total)}</span>
              </div>
            ))}
            {topTippedUsers.length === 0 && <p className="text-gray-600 text-sm">No tips yet.</p>}
          </div>
        </div>
      </div>

      {/* Recent tips */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Recent Tips</h2>
        {recentTips.length === 0 ? (
          <p className="text-gray-600 text-sm">No tips yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="pb-3 pr-4">From</th><th className="pb-3 pr-4">To</th>
                <th className="pb-3 pr-4">Amount</th><th className="pb-3">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {recentTips.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-2.5 pr-4 text-gray-300">{t.from.username}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{t.to.username}</td>
                    <td className="py-2.5 pr-4 text-yellow-400 font-semibold">{cents(t.amount)}</td>
                    <td className="py-2.5 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}
