// POST /api/admin/warnings — issue a warning, suspend, or ban a user
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const adminId = Number(cookieStore.get('userId')?.value ?? 0);
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, action, reason, suspendDays } = await req.json();
  if (!userId || !action) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  if (action === 'warn') {
    await prisma.userWarning.create({ data: { userId, adminId, reason: reason || 'Policy violation' } });
    await prisma.auditLog.create({ data: { adminId, action: 'WARN_USER', targetId: userId, targetType: 'User', detail: reason } });
  } else if (action === 'suspend') {
    const until = new Date(Date.now() + (Number(suspendDays) || 7) * 86400000);
    await prisma.user.update({ where: { id: userId }, data: { suspendedUntil: until } });
    await prisma.auditLog.create({ data: { adminId, action: 'SUSPEND_USER', targetId: userId, targetType: 'User', detail: `Suspended for ${suspendDays} days. Reason: ${reason}` } });
  } else if (action === 'ban') {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: true } });
    await prisma.auditLog.create({ data: { adminId, action: 'BAN_USER', targetId: userId, targetType: 'User', detail: reason } });
  } else if (action === 'unban') {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: false, suspendedUntil: null } });
    await prisma.auditLog.create({ data: { adminId, action: 'UNBAN_USER', targetId: userId, targetType: 'User', detail: reason } });
  }

  return NextResponse.json({ ok: true });
}
