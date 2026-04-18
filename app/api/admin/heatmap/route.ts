// app/api/admin/heatmap/route.ts
// GET — returns daily activity counts (signups, stories, comments) for the past 52 weeks.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const since = new Date();
  since.setDate(since.getDate() - 364);

  const [users, stories, comments] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.story.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const counts: Record<string, { users: number; stories: number; comments: number }> = {};
  const ensure = (k: string) => { if (!counts[k]) counts[k] = { users: 0, stories: 0, comments: 0 }; };

  for (const u of users)    { const k = fmt(u.createdAt);  ensure(k); counts[k].users++; }
  for (const s of stories)  { const k = fmt(s.createdAt);  ensure(k); counts[k].stories++; }
  for (const c of comments) { const k = fmt(c.createdAt);  ensure(k); counts[k].comments++; }

  return NextResponse.json({ counts });
}
