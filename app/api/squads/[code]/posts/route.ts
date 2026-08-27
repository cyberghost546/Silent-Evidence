// ============================================================
//  GET  /api/squads/[code]/posts  — fetch all posts for this squad
//  POST /api/squads/[code]/posts  — create a new post in this squad
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/squads/[code]/posts
// Returns all squad posts ordered newest-first, with the author's username
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // First resolve the squad by code to get its numeric id
  const squad = await prisma.squad.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true },
  });

  if (!squad) {
    return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
  }

  // Fetch all posts for this squad, including the posting user's username
  const posts = await prisma.squadPost.findMany({
    where: { squadId: squad.id },
    include: {
      // Pull the user record so we can show the username next to each post
      user: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' }, // Newest posts first
  });

  // Map to a clean shape: flatten user info into the post object
  const result = posts.map((p) => ({
    id: p.id,
    content: p.content,
    storyUrl: p.storyUrl,
    createdAt: p.createdAt,
    userId: p.userId,
    username: p.user.username,
  }));

  return NextResponse.json({ posts: result });
}

// POST /api/squads/[code]/posts
// Body: { userId, content?, storyUrl? }
// Creates a new post inside the squad.
// At least one of content or storyUrl must be provided.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json();
  const { userId, content, storyUrl } = body;

  // Require userId — content and storyUrl are optional but at least one should exist
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Reject posts with neither a message nor a story link — empty posts aren't useful
  if (!content && !storyUrl) {
    return NextResponse.json({ error: 'content or storyUrl is required' }, { status: 400 });
  }

  // Look up the squad to get its id (the foreign key we need for the post)
  const squad = await prisma.squad.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true },
  });

  if (!squad) {
    return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
  }

  // Verify the user is actually a member of this squad before letting them post
  const membership = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: squad.id, userId } },
  });

  if (!membership) {
    return NextResponse.json({ error: 'You must be a member to post' }, { status: 403 });
  }

  // Create the post, then fetch back the user's username for the response
  const post = await prisma.squadPost.create({
    data: {
      squadId: squad.id,
      userId,
      content: content ?? null,
      storyUrl: storyUrl ?? null,
    },
    include: {
      user: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json({
    id: post.id,
    content: post.content,
    storyUrl: post.storyUrl,
    createdAt: post.createdAt,
    userId: post.userId,
    username: post.user.username,
  });
}
