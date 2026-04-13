// app/api/user/2fa/route.ts
// PATCH — toggles two-factor authentication on/off for the current user.
// When enabling 2FA, the next login will require an emailed code.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { enabled } = await req.json();

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: Boolean(enabled) },
  });

  return NextResponse.json({ twoFactorEnabled: Boolean(enabled) });
}
