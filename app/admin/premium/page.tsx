import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import PremiumClient from './PremiumClient';

export const metadata = { title: 'Premium Subscribers — Admin' };

export default async function AdminPremiumPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== 'ADMIN') redirect('/');

  const [subs, counts] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        // avatar lives on Profile, not User — selecting it directly on User is
        // a type error. Reach it through the relation, as the rest of the app does.
        user: { select: { id: true, username: true, email: true, profile: { select: { avatar: true } } } },
      },
    }),
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
  ]);

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-1 h-6 bg-yellow-500 rounded-full" />
        <h1 className="text-2xl font-bold text-white">Premium Subscribers</h1>
        <span className="text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
          {subs.filter(s => s.status === 'active').length} active
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        View and manage all premium subscriptions. Edit status, plan, or expiry — or manually grant premium to any user.
      </p>
      <PremiumClient
        initialSubs={JSON.parse(JSON.stringify(subs))}
        initialCounts={JSON.parse(JSON.stringify(counts))}
      />
    </>
  );
}
