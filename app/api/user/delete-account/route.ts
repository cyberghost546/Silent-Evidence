// app/api/user/delete-account/route.ts
// DELETE — permanently deletes the current user's account and all associated data.
// Cascade deletes in the schema handle related records (stories, comments, etc.)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { clearSessionCookies } from '@/lib/sessionCookie';

export async function DELETE() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Delete the user — cascades to all related records via Prisma schema onDelete: Cascade
  await prisma.user.delete({ where: { id: userId } });

  // Clear the auth cookie so the browser session ends immediately
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);

  return response;
}
