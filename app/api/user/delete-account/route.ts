// app/api/user/delete-account/route.ts
// DELETE — permanently deletes the current user's account and all associated data.
// Cascade deletes in the schema handle related records (stories, comments, etc.)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { clearSessionCookies } from '@/lib/sessionCookie';
import { verifyCsrfToken } from '@/lib/csrf';
import { checkOwnerProtection, adminCount } from '@/lib/owner';

export async function DELETE(req: Request) {
  // Account deletion is irreversible and cascades across every table, yet this
  // was the one destructive endpoint with no CSRF check — every other mutating
  // route in the app verifies the double-submit token. Same guard here.
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // The owner and the last admin cannot self-delete either — otherwise the same
  // lock-out the admin route now prevents could be caused from the settings page.
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const protection = checkOwnerProtection(me, null, await adminCount());
  if (!protection.allowed) {
    return NextResponse.json({ error: protection.reason }, { status: 409 });
  }

  // Delete the user — cascades to all related records via Prisma schema onDelete: Cascade
  await prisma.user.delete({ where: { id: userId } });

  // Clear the auth cookie so the browser session ends immediately
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);

  return response;
}
