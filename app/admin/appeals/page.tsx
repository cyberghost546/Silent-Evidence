// app/admin/appeals/page.tsx
//
// Admin appeals queue. Lists OPEN appeals with the original moderation decision
// and its statement of reasons, so a reviewer can uphold or overturn. Auth is
// handled by app/admin/layout.tsx (admin-only). The independence rule — a
// reviewer may not decide an appeal against their own action — is computed here
// (canReview) and enforced again in the decision API.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import AdminAppealsClient from './AdminAppealsClient';
import { Gavel } from 'lucide-react';

export const metadata = { title: 'Appeals — Admin' };

export default async function AdminAppealsPage() {
  const cookieStore = await cookies();
  const viewerId = Number(cookieStore.get('userId')?.value ?? 0) || 0;

  const raw = await prisma.moderationAppeal.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      message: true,
      createdAt: true,
      user: { select: { id: true, username: true } },
      action: {
        select: {
          id: true,
          type: true,
          targetType: true,
          targetId: true,
          reason: true,
          explanation: true,
          automated: true,
          moderatorId: true,
          moderator: { select: { username: true } },
        },
      },
    },
  });

  const appeals = raw.map((a) => ({
    id: a.id,
    message: a.message,
    createdAt: a.createdAt.toISOString(),
    // A reviewer may decide any appeal except one against their own action.
    // Automated actions (no moderator) may be reviewed by anyone.
    canReview: a.action.moderatorId === null || a.action.moderatorId !== viewerId,
    user: a.user,
    action: {
      id: a.action.id,
      type: a.action.type,
      targetType: a.action.targetType,
      targetId: a.action.targetId,
      reason: a.action.reason,
      explanation: a.action.explanation,
      automated: a.action.automated,
      moderator: a.action.moderator,
    },
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Gavel className="w-6 h-6 text-red-500" strokeWidth={1.75} aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-white">Appeals</h1>
          <p className="text-sm text-gray-500">
            {appeals.length} open appeal{appeals.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <AdminAppealsClient appeals={appeals} />
    </div>
  );
}
