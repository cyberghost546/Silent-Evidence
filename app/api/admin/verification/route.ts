// POST /api/admin/verification — approve or reject a verification application
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const adminId = Number(cookieStore.get('userId')?.value ?? 0);
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, action } = await req.json();
  if (!userId || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const KEY = 'verification_requests';
  const setting = await prisma.siteSetting.findUnique({ where: { key: KEY } });
  const requests: { userId: number; status: string }[] = setting?.value ? JSON.parse(setting.value) : [];

  const updated = requests.map(r => r.userId === userId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r);
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(updated) },
    update: { value: JSON.stringify(updated) },
  });

  if (action === 'approve') {
    await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  }

  await prisma.auditLog.create({
    data: { adminId, action: action === 'approve' ? 'VERIFY_USER' : 'REJECT_VERIFICATION', targetId: userId, targetType: 'User', detail: `${action === 'approve' ? 'Approved' : 'Rejected'} verification for user #${userId}` },
  });

  return NextResponse.json({ ok: true });
}
