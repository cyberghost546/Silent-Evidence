// app/api/admin/moderation/route.ts
//
// POST — an admin records a moderation action with its statement of reasons.
// This is what an admin calls when removing content, warning, suspending, or
// banning, so the decision is documented and the affected user is notified and
// can appeal. Kept separate from the plain report status-flip so that "reviewed"
// and "acted, with reasons" are distinct.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { verifyCsrfToken } from '@/lib/csrf';
import { forbidden, badRequest, serverError } from '@/lib/apiError';
import { recordModerationAction } from '@/lib/moderation';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const Schema = z.object({
  type: z.enum(['CONTENT_REMOVED', 'CONTENT_HIDDEN', 'CONTENT_REJECTED', 'WARNING', 'ACCOUNT_SUSPENDED', 'ACCOUNT_BANNED']),
  targetType: z.enum(['STORY', 'COMMENT', 'FORUM_POST', 'FORUM_REPLY', 'ACCOUNT']),
  targetId: z.number().int().positive(),
  affectedUserId: z.number().int().positive(),
  reason: z.enum(['HARASSMENT', 'HATE_SPEECH', 'SPAM', 'INAPPROPRIATE', 'THREATS', 'COPYRIGHT', 'ILLEGAL_CONTENT', 'OTHER']),
  explanation: z.string().min(5, 'A statement of reasons is required.').max(4000),
  legalGround: z.string().max(500).optional(),
  reportId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request.');

  try {
    const action = await recordModerationAction({
      ...parsed.data,
      automated: false,
      moderatorId: admin.id,
    });

    // Also record it in the admin audit log, tying who acted to the decision.
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'MODERATION_ACTION',
        detail: `${parsed.data.type} on ${parsed.data.targetType} ${parsed.data.targetId} (user ${parsed.data.affectedUserId}): ${parsed.data.explanation}`,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, actionId: action.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/moderation]', err);
    return serverError();
  }
}
