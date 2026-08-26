// app/api/user/recovery-codes/route.ts
//
// Manage the signed-in user's backup recovery codes.
//
//   GET  — how many unused codes remain (never returns the codes themselves;
//          the plaintext only ever exists in the POST response that creates it).
//   POST — generate a fresh set, returning the plaintext once. Replaces any
//          existing set.
//
// Generating codes is a sensitive action: whoever holds a valid set can pass 2FA
// and, for the owner, trigger break-glass recovery. So POST re-verifies the
// account password even though the user is already logged in — a stolen session
// alone must not be enough to mint a new set of standing credentials. It is also
// CSRF-protected, like every mutating route here.

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { verifyCsrfToken } from '@/lib/csrf';
import { unauthorized, serverError } from '@/lib/apiError';
import { regenerateRecoveryCodes, countUnused, RECOVERY_CODE_COUNT } from '@/lib/recoveryCodes';
import { z } from 'zod';

const RegenerateSchema = z.object({
  password: z.string().min(1, 'Your password is required to regenerate codes.'),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const remaining = await countUnused(userId);
    return NextResponse.json({ remaining, total: RECOVERY_CODE_COUNT });
  } catch (err) {
    console.error('[GET /api/user/recovery-codes]', err);
    return serverError();
  }
}

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const parsed = RegenerateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) return unauthorized();

    // Re-confirm the password. Same generic failure whether the account is
    // OAuth-only (empty hash) or the password is simply wrong.
    const ok = user.password && (await bcrypt.compare(parsed.data.password, user.password));
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 403 });
    }

    const codes = await regenerateRecoveryCodes(userId);

    // Audit trail: a new set of standing credentials was minted for this account.
    await prisma.auditLog.create({
      data: {
        adminId: userId,
        action: 'RECOVERY_CODES_REGENERATED',
        detail: `Generated ${codes.length} new recovery codes.`,
        targetType: 'User',
        targetId: userId,
      },
    });

    // This is the only time the plaintext is ever returned. Never cached.
    return new NextResponse(JSON.stringify({ codes }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' },
    });
  } catch (err) {
    console.error('[POST /api/user/recovery-codes]', err);
    return serverError();
  }
}
