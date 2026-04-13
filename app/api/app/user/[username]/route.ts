// app/api/app/user/[username]/route.ts
// GET — returns public profile data + published stories for a given username.
// Accepts optional x-user-id header to check if the viewer already follows them.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Optional: the logged-in app user's ID to determine follow state
  const viewerId = Number(req.headers.get('x-user-id') ?? 0) || null;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      profile: { select: { bio: true, avatar: true, website: true } },
      _count: { select: { stories: true, followers: true, following: true } },
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Check if the viewer is already following this user
  const isFollowing = viewerId
    ? !!(await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: user.id },
        },
      }))
    : false;

  // Get all published stories by this user, newest first
  const stories = await prisma.story.findMany({
    where: { authorId: user.id, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      views: true,
      createdAt: true,
      category: { select: { name: true, slug: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  // Fall back to a generated avatar if the user has no profile picture
  const avatar =
    user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=22c55e&color=fff&size=128`;

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      bio: user.profile?.bio ?? null,
      avatar,
      website: user.profile?.website ?? null,
      storyCount: user._count.stories,
      followerCount: user._count.followers,
      followingCount: user._count.following,
    },
    isFollowing,
    stories,
  });
}
