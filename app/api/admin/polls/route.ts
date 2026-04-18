import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const cookieStore = await cookies();
  const id = Number(cookieStore.get('userId')?.value ?? 0);
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  return u?.role === 'ADMIN' ? id : null;
}

export async function POST(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { question, options, endsAt } = await req.json();
  const poll = await prisma.poll.create({
    data: {
      question,
      endsAt: endsAt ? new Date(endsAt) : null,
      authorId: adminId,
      options: { create: options.map((text: string) => ({ text })) },
    },
    include: { options: { include: { _count: { select: { votes: true } } } }, _count: { select: { votes: true } } },
  });
  await prisma.auditLog.create({ data: { adminId, action: 'CREATE_POLL', targetId: poll.id, targetType: 'Poll', detail: question } });
  return NextResponse.json(poll);
}

export async function PATCH(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, endsAt } = await req.json();
  await prisma.poll.update({ where: { id }, data: { endsAt: new Date(endsAt) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  await prisma.poll.delete({ where: { id } });
  await prisma.auditLog.create({ data: { adminId, action: 'DELETE_POLL', targetId: id, targetType: 'Poll' } });
  return NextResponse.json({ ok: true });
}
