// app/api/user/block/route.ts
// POST   — block a user by username
// DELETE — unblock a user by username
// GET    — list all users the current user has blocked

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function getCallerId() {
  const c = await cookies();
  return Number(c.get('userId')?.value ?? 0) || null;
}

// GET /api/user/block — returns the list of blocked users
export async function GET() {
  const callerId = await getCallerId();
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const blocked = await prisma.blockedUser.findMany({
    where: { blockerId: callerId },
    include: {
      blocked: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(blocked.map((b) => b.blocked));
}

// POST /api/user/block — body: { username }
export async function POST(req: NextRequest) {
  const callerId = await getCallerId();
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  // Look up the user to block
  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.id === callerId)
    return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });

  // Use upsert to be idempotent — blocking an already-blocked user is a no-op
  await prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId: callerId, blockedId: target.id } },
    create: { blockerId: callerId, blockedId: target.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/user/block — body: { username }
export async function DELETE(req: NextRequest) {
  const callerId = await getCallerId();
  if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // deleteMany handles the case where the block doesn't exist (no error thrown)
  await prisma.blockedUser.deleteMany({
    where: { blockerId: callerId, blockedId: target.id },
  });

  return NextResponse.json({ ok: true });
}
