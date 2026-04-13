// app/api/user/newsletter/route.ts
// PATCH — toggles the logged-in user's newsletter subscription on/off.
// Called from the Newsletter section in /settings.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Expect { subscribed: boolean }
  const { subscribed } = await req.json();
  if (typeof subscribed !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { newsletterSubscribed: subscribed },
  });

  return NextResponse.json({ ok: true, subscribed });
}
