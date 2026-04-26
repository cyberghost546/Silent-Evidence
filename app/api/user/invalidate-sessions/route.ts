// POST /api/user/invalidate-sessions
// Increments sessionVersion in the DB, which invalidates every active session
// for this user except the one making this request (which is also cleared).
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { unauthorized, serverError } from '@/lib/apiError';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    await prisma.user.update({
      where: { id: userId },
      data:  { sessionVersion: { increment: 1 } },
    });

    const res = NextResponse.json({ ok: true });
    // Clear the current session cookie so this device is also logged out
    res.cookies.set('userId', '', { maxAge: 0, path: '/' });
    return res;
  } catch (err) {
    console.error('[POST /api/user/invalidate-sessions]', err);
    return serverError();
  }
}
