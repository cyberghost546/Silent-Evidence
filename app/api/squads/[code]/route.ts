// ============================================================
//  GET   /api/squads/[code]  — fetch squad details, members, and recent posts
//  PATCH /api/squads/[code]  — join a squad  { userId, action: 'join' }
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/squads/[code]
// Returns the full squad object including:
//   - Squad metadata (name, description, host)
//   - All current members with their usernames
//   - The last 20 posts with the posting user's username
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  // Await the dynamic route param (Next.js 15 requires params to be awaited)
  const { code } = await params;

  // Look up squad by its unique invite code (always compare uppercased)
  const squad = await prisma.squad.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      // Include the host's username for display in the UI
      host: { select: { id: true, username: true } },
      // Include all members with usernames so the member list can be rendered
      members: {
        include: {
          user: { select: { id: true, username: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
      // Fetch the 20 most recent posts, newest first
      posts: {
        include: {
          // Include the posting user's username for attribution
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  // Return 404 if no squad matches the code
  if (!squad) {
    return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
  }

  // Reshape data into a clean response shape for the frontend
  return NextResponse.json({
    id: squad.id,
    name: squad.name,
    code: squad.code,
    description: squad.description,
    createdAt: squad.createdAt,
    host: squad.host,
    // Flatten member records: [{ userId, username, joinedAt }]
    members: squad.members.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      joinedAt: m.joinedAt,
    })),
    // Flatten post records: [{ id, content, storyUrl, createdAt, user }]
    posts: squad.posts.map((p) => ({
      id: p.id,
      content: p.content,
      storyUrl: p.storyUrl,
      createdAt: p.createdAt,
      user: p.user,
    })),
  });
}

// PATCH /api/squads/[code]
// Body: { userId, action: 'join' }
// Adds a user to the squad as a SquadMember if not already a member
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const { userId, action } = body;

  // Validate required fields
  if (!userId || action !== 'join') {
    return NextResponse.json({ error: 'userId and action "join" are required' }, { status: 400 });
  }

  // Look up the squad so we can get its numeric id
  const squad = await prisma.squad.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!squad) {
    return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
  }

  // Use upsert so joining an already-joined squad is a no-op rather than an error
  // The unique constraint is [squadId, userId] defined in the schema
  await prisma.squadMember.upsert({
    where: {
      squadId_userId: { squadId: squad.id, userId },
    },
    create: {
      squadId: squad.id,
      userId,
    },
    update: {}, // Nothing to update — membership is already recorded
  });

  return NextResponse.json({ ok: true, squadId: squad.id, code: squad.code, name: squad.name });
}
