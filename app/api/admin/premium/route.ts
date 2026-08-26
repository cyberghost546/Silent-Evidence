import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN' ? userId : null;
}

// GET /api/admin/premium — list all subscriptions with user info
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const status = req.nextUrl.searchParams.get('status') ?? 'all';

  const subs = await prisma.subscription.findMany({
    where: status !== 'all' ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        // avatar lives on Profile, not User — reach it through the relation.
        select: { id: true, username: true, email: true, profile: { select: { avatar: true } } },
      },
    },
  });

  const counts = await prisma.subscription.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  return NextResponse.json({ subs, counts });
}

// PATCH /api/admin/premium — update an existing subscription
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { subId, status, plan, currentPeriodEnd } = await req.json();
  if (!subId) return NextResponse.json({ error: 'Missing subId' }, { status: 400 });

  const updated = await prisma.subscription.update({
    where: { id: subId },
    data: {
      ...(status !== undefined && { status }),
      ...(plan !== undefined && { plan }),
      ...(currentPeriodEnd !== undefined && {
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      }),
    },
    include: {
      user: {
        select: { id: true, username: true, email: true, profile: { select: { avatar: true } } },
      },
    },
  });

  return NextResponse.json({ sub: updated });
}

// POST /api/admin/premium — manually grant premium to a user (no Stripe)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, plan, currentPeriodEnd } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const sub = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: `manual_${userId}`,
      status: 'active',
      plan: plan ?? 'monthly',
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
    },
    update: {
      status: 'active',
      plan: plan ?? 'monthly',
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
    },
    include: {
      user: {
        select: { id: true, username: true, email: true, profile: { select: { avatar: true } } },
      },
    },
  });

  return NextResponse.json({ sub });
}

// DELETE /api/admin/premium — revoke (delete) a subscription record
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { subId } = await req.json();
  if (!subId) return NextResponse.json({ error: 'Missing subId' }, { status: 400 });

  await prisma.subscription.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
}
