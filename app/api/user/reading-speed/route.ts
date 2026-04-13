// app/api/user/reading-speed/route.ts
// PATCH — updates the current user's readingSpeed preference.
// Accepted values: 'slow' | 'average' | 'fast'

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const VALID_SPEEDS = ['slow', 'average', 'fast'];

export async function PATCH(req: NextRequest) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { readingSpeed } = await req.json();
  if (!VALID_SPEEDS.includes(readingSpeed)) {
    return NextResponse.json({ error: 'Invalid speed' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { readingSpeed },
  });

  return NextResponse.json({ ok: true });
}
