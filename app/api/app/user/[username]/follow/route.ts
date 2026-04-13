// app/api/app/user/[username]/follow/route.ts
// POST — toggles follow/unfollow for the given username.
// Requires x-user-id header (the logged-in app user's ID).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  // Get the caller's user ID from the app auth header
  const followerId = Number(req.headers.get('x-user-id') ?? 0);
  if (!followerId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const { username } = await params;

  // Look up the target user
  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (target.id === followerId) {
    return NextResponse.json({ error: 'Cannot follow yourself.' }, { status: 400 });
  }

  // Toggle: delete the follow if it exists, create it if it doesn't
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: target.id } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({ data: { followerId, followingId: target.id } });

  // Notify the followed user (fire and forget — don't block the response)
  const follower = await prisma.user.findUnique({
    where: { id: followerId },
    select: { username: true },
  });
  prisma.notification
    .create({
      data: {
        userId: target.id,
        type: 'FOLLOW',
        message: `${follower?.username ?? 'Someone'} started following you.`,
      },
    })
    .catch(() => {});

  return NextResponse.json({ following: true });
}
