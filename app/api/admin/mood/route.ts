// POST /api/admin/mood — set the mood of the day
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { isMood } from '@/lib/moods';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const adminId = Number(cookieStore.get('userId')?.value ?? 0);
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!admin || admin.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { mood, message } = await req.json();
  // Validated against the canonical list rather than a local copy. The local
  // copy here omitted DARK and predated the enum change, so a mood set through
  // this route rendered as "Unknown" on the homepage banner.
  if (!isMood(mood)) return NextResponse.json({ error: 'Invalid mood' }, { status: 400 });
  await prisma.moodOfDay.create({ data: { mood, message: message || null, setById: adminId } });
  await prisma.auditLog.create({
    data: { adminId, action: 'SET_MOOD', detail: `Set mood to ${mood}` },
  });
  return NextResponse.json({ ok: true });
}
