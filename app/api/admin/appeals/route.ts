// app/api/admin/appeals/route.ts
//
// GET — the appeals queue for admins. Defaults to OPEN appeals; pass ?status= to
// see decided ones. Each row carries the appeal, the original action and its
// statement of reasons, and who originally moderated it — so a reviewer can see
// whether they are allowed to decide it (they may not review their own action).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { forbidden, serverError } from '@/lib/apiError';

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');
  const status = ['OPEN', 'UPHELD', 'OVERTURNED'].includes(statusParam ?? '')
    ? (statusParam as 'OPEN' | 'UPHELD' | 'OVERTURNED')
    : 'OPEN';

  try {
    const appeals = await prisma.moderationAppeal.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' }, // oldest first — fairest queue order
      take: 100,
      select: {
        id: true,
        status: true,
        message: true,
        decisionNote: true,
        createdAt: true,
        decidedAt: true,
        user: { select: { id: true, username: true } },
        reviewer: { select: { id: true, username: true } },
        action: {
          select: {
            id: true,
            type: true,
            targetType: true,
            targetId: true,
            reason: true,
            explanation: true,
            automated: true,
            status: true,
            createdAt: true,
            moderatorId: true,
            moderator: { select: { username: true } },
          },
        },
      },
    });

    // Tell the client which appeals THIS admin may decide — anything they did not
    // originally moderate (automated actions have no moderator, so anyone may).
    const withEligibility = appeals.map((a) => ({
      ...a,
      canReview: a.action.moderatorId === null || a.action.moderatorId !== admin.id,
    }));

    return NextResponse.json({ appeals: withEligibility, viewerId: admin.id });
  } catch (err) {
    console.error('[GET /api/admin/appeals]', err);
    return serverError();
  }
}
