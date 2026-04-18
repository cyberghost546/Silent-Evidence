// app/api/following/feed/route.ts
// GET — returns the latest published stories from authors the logged-in user follows.
// Supports pagination via ?skip= and ?take=.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get('take') ?? 12), 30);
  const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);

  // Get the list of author IDs this user follows
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const followedIds = follows.map(f => f.followingId);

  if (followedIds.length === 0) {
    return NextResponse.json({ stories: [], followedIds: [] });
  }

  const stories = await prisma.story.findMany({
    where: {
      status: 'PUBLISHED',
      authorId: { in: followedIds },
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      content: true,
      createdAt: true,
      views: true,
      mood: true,
      author:   { select: { username: true, profile: { select: { avatar: true } } } },
      category: { select: { name: true, slug: true } },
      _count:   { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json({ stories, followedIds });
}
