// app/api/user/[username]/followers/route.ts
// GET — returns the list of users who follow the given username.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Each Follow row has a follower (the person who pressed Follow)
  const follows = await prisma.follow.findMany({
    where: { followingId: user.id },
    select: {
      follower: {
        select: {
          username: true,
          profile: { select: { avatar: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Return a flat list of user objects
  const users = follows.map((f) => ({
    username: f.follower.username,
    avatar:
      f.follower.profile?.avatar ??
      `https://ui-avatars.com/api/?name=${encodeURIComponent(f.follower.username)}&background=22c55e&color=fff&size=64`,
  }));

  return NextResponse.json({ users });
}
