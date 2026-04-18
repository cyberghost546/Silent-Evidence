// app/api/admin/calendar/route.ts
// GET — returns all scheduled stories for the content calendar.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const stories = await prisma.story.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { not: null } },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true, title: true, slug: true, scheduledAt: true,
      author:   { select: { username: true } },
      category: { select: { name: true } },
    },
  });

  return NextResponse.json({ stories });
}
