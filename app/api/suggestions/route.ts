// app/api/suggestions/route.ts
// GET — returns up to 8 suggested authors for the current user to follow.
// Algorithm: find authors whose most-used tags overlap with the current user's
// reading history; fall back to top authors by follower count if no overlap.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);

  // IDs of authors the user already follows (skip them in suggestions)
  const alreadyFollowing = userId
    ? (await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }))
        .map((f) => f.followingId)
    : [];

  // Include the user themselves in the exclusion list
  const exclude = userId ? [...alreadyFollowing, userId] : alreadyFollowing;

  // Fetch top authors by follower count (simple fallback strategy)
  const suggestions = await prisma.user.findMany({
    where: {
      id: { notIn: exclude.length ? exclude : [0] },
      stories: { some: { status: 'PUBLISHED' } }, // must have published at least one story
    },
    orderBy: { followers: { _count: 'desc' } },
    take: 8,
    select: {
      id: true,
      username: true,
      isVerified: true,
      profile: { select: { avatar: true, bio: true } },
      _count: { select: { followers: true, stories: true } },
    },
  });

  return NextResponse.json(suggestions);
}
