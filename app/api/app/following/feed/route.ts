// app/api/app/following/feed/route.ts
// GET — returns the 30 most recent published stories from users
// that the logged-in app user follows.
// Requires x-user-id header.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const userId = Number(req.headers.get('x-user-id') ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Find all user IDs this person follows
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const followingIds = follows.map((f) => f.followingId);

  // Return an empty list if they don't follow anyone yet
  if (followingIds.length === 0) {
    return NextResponse.json({ stories: [] });
  }

  // Get the latest 30 stories from followed authors
  const stories = await prisma.story.findMany({
    where: { authorId: { in: followingIds }, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      views: true,
      createdAt: true,
      category: { select: { name: true } },
      author: {
        select: {
          username: true,
          profile: { select: { avatar: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json({ stories });
}
