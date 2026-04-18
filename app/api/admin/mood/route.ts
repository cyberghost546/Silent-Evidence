// POST /api/admin/mood — set the mood of the day
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const adminId = Number(cookieStore.get('userId')?.value ?? 0);
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { mood, message } = await req.json();
  const VALID = ['CREEPY','PARANOID','DISTURBING','ATMOSPHERIC','PSYCHOLOGICAL','SUPERNATURAL','GORE','JUMPSCARE'];
  if (!VALID.includes(mood)) return NextResponse.json({ error: 'Invalid mood' }, { status: 400 });
  await prisma.moodOfDay.create({ data: { mood, message: message || null, setById: adminId } });
  await prisma.auditLog.create({ data: { adminId, action: 'SET_MOOD', detail: `Set mood to ${mood}` } });
  return NextResponse.json({ ok: true });
}
