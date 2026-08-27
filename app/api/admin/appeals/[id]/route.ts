// app/api/admin/appeals/[id]/route.ts
//
// PATCH — an admin decides an appeal: UPHELD (original decision stands) or
// OVERTURNED (decision reversed). On OVERTURNED the underlying moderation action
// is marked REVERSED and the user is notified.
//
// INDEPENDENCE (DSA Art. 20): the reviewer must not be the same admin who took
// the original action. That is enforced here, not just hinted at in the UI, so it
// cannot be bypassed by calling the API directly.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { verifyCsrfToken } from '@/lib/csrf';
import { forbidden, badRequest, notFound, serverError } from '@/lib/apiError';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const Schema = z.object({
  decision: z.enum(['UPHELD', 'OVERTURNED']),
  note: z.string().max(4000).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const { id } = await params;
  const appealId = Number(id);
  if (!Number.isFinite(appealId)) return badRequest('Invalid appeal id.');

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request.');

  try {
    const appeal = await prisma.moderationAppeal.findUnique({
      where: { id: appealId },
      select: {
        id: true,
        status: true,
        userId: true,
        action: { select: { id: true, moderatorId: true, type: true } },
      },
    });
    if (!appeal) return notFound('Appeal not found.');

    if (appeal.status !== 'OPEN') {
      return NextResponse.json({ error: 'This appeal has already been decided.' }, { status: 409 });
    }

    // The independence rule. Automated actions (moderatorId === null) have no
    // original human, so any admin may review them.
    if (appeal.action.moderatorId !== null && appeal.action.moderatorId === admin.id) {
      return NextResponse.json(
        {
          error:
            'You made the original decision, so you cannot review this appeal. Another admin must.',
        },
        { status: 403 }
      );
    }

    const overturned = parsed.data.decision === 'OVERTURNED';

    // Decide the appeal, reverse the action if overturned, and notify the user —
    // all in one transaction so the three never drift out of step.
    await prisma.$transaction([
      prisma.moderationAppeal.update({
        where: { id: appeal.id },
        data: {
          status: parsed.data.decision,
          decisionNote: parsed.data.note ?? null,
          reviewerId: admin.id,
          decidedAt: new Date(),
        },
      }),
      ...(overturned
        ? [
            prisma.moderationAction.update({
              where: { id: appeal.action.id },
              data: { status: 'REVERSED' },
            }),
          ]
        : []),
      prisma.notification.create({
        data: {
          userId: appeal.userId,
          type: 'MODERATION',
          message: overturned
            ? `Your appeal was upheld and the decision has been reversed.${parsed.data.note ? ' ' + parsed.data.note : ''}`
            : `Your appeal was reviewed and the original decision stands.${parsed.data.note ? ' ' + parsed.data.note : ''}`,
        },
      }),
    ]);

    await prisma.auditLog
      .create({
        data: {
          adminId: admin.id,
          action: 'APPEAL_DECISION',
          detail: `Appeal ${appeal.id} ${parsed.data.decision} for action ${appeal.action.id}.`,
          targetType: 'ModerationAppeal',
          targetId: appeal.id,
        },
      })
      .catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/admin/appeals/[id]]', err);
    return serverError();
  }
}
