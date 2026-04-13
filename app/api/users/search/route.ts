// GET /api/users/search?q=<query> — search users by username (for starting DM conversations)
// Returns up to 10 matching users, excluding the caller.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q },
      // Exclude the logged-in user from results so you can't message yourself
      ...(userId ? { NOT: { id: userId } } : {}),
    },
    select: {
      id: true,
      username: true,
      profile: { select: { avatar: true } },
    },
    take: 10,
    orderBy: { username: 'asc' },
  });

  return NextResponse.json(users);
}
