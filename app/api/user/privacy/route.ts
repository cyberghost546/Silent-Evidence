// app/api/user/privacy/route.ts
// PATCH — toggles the isPrivate flag on the current user's account

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { isPrivate } = await req.json();
  if (typeof isPrivate !== 'boolean') {
    return NextResponse.json({ error: 'isPrivate must be a boolean' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { isPrivate } });
  return NextResponse.json({ ok: true, isPrivate });
}
