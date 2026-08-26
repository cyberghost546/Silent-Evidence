// app/api/appeals/route.ts
//
// The user side of the DSA internal complaint process (Art. 20).
//
//   GET  — the moderation decisions taken against you, each with its statement of
//          reasons and the status of any appeal you have filed.
//   POST — file an appeal against one of those decisions.
//
// A user may only see and appeal decisions about their own content or account.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { verifyCsrfToken } from '@/lib/csrf';
import { unauthorized, serverError, badRequest } from '@/lib/apiError';
import { z } from 'zod';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const actions = await prisma.moderationAction.findMany({
      where: { affectedUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        targetType: true,
        reason: true,
        explanation: true,
        legalGround: true,
        automated: true,
        status: true,
        createdAt: true,
        appeals: {
          where: { userId },
          select: { id: true, status: true, message: true, decisionNote: true, createdAt: true, decidedAt: true },
        },
      },
    });
    return NextResponse.json({ actions });
  } catch (err) {
    console.error('[GET /api/appeals]', err);
    return serverError();
  }
}

const AppealSchema = z.object({
  actionId: z.number().int().positive(),
  message: z.string().min(10, 'Please explain why you think this decision was wrong (at least 10 characters).').max(4000),
});

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const parsed = AppealSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request.');

  try {
    // The action must exist AND belong to this user — you cannot appeal a decision
    // that was not made about you.
    const action = await prisma.moderationAction.findUnique({
      where: { id: parsed.data.actionId },
      select: { id: true, affectedUserId: true },
    });
    if (!action || action.affectedUserId !== userId) {
      // Same response whether it does not exist or is not yours, so this cannot be
      // used to probe other users' moderation history.
      return NextResponse.json({ error: 'Decision not found.' }, { status: 404 });
    }

    // One appeal per decision. The unique constraint also guards this at the DB
    // level; catching it here gives a friendlier message.
    const existing = await prisma.moderationAppeal.findUnique({
      where: { actionId_userId: { actionId: action.id, userId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already appealed this decision.' }, { status: 409 });
    }

    const appeal = await prisma.moderationAppeal.create({
      data: { actionId: action.id, userId, message: parsed.data.message },
      select: { id: true, status: true },
    });

    return NextResponse.json({ ok: true, appeal }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/appeals]', err);
    return serverError();
  }
}
