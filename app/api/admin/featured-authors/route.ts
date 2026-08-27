// GET  — search users by username
// POST — save the featured authors list
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const cookieStore = await cookies();
  const id = Number(cookieStore.get('userId')?.value ?? 0);
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  return u?.role === 'ADMIN' ? id : null;
}

export async function GET(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const q = new URL(req.url).searchParams.get('q') ?? '';
  const users = await prisma.user.findMany({
    where: { username: { contains: q } },
    take: 8,
    select: {
      id: true,
      username: true,
      isVerified: true,
      _count: { select: { stories: true, followers: true } },
    },
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      isVerified: u.isVerified,
      stories: u._count.stories,
      followers: u._count.followers,
    })),
  });
}

export async function POST(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { ids } = await req.json();
  await prisma.siteSetting.upsert({
    where: { key: 'featured_authors' },
    create: { key: 'featured_authors', value: JSON.stringify(ids) },
    update: { value: JSON.stringify(ids) },
  });
  await prisma.auditLog.create({
    data: {
      adminId,
      action: 'UPDATE_FEATURED_AUTHORS',
      detail: `Set featured authors: ${ids.join(', ')}`,
    },
  });
  return NextResponse.json({ ok: true });
}
