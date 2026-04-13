// app/api/user/[username]/following/route.ts
// GET — returns the list of users that the given username follows.

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

  // Each Follow row has a following (the person being followed)
  const follows = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: {
      following: {
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
    username: f.following.username,
    avatar:
      f.following.profile?.avatar ??
      `https://ui-avatars.com/api/?name=${encodeURIComponent(f.following.username)}&background=22c55e&color=fff&size=64`,
  }));

  return NextResponse.json({ users });
}
