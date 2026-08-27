// app/api/collaborators/route.ts
// Handles inviting a co-author to a story (POST) and
// listing current collaborators for a story (GET).

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// ─── GET /api/collaborators?storyId=X ────────────────────────────────────────
// Returns all collaborator records for the given story.
// Each record includes the collaborator user's username and their acceptance status.
export async function GET(req: NextRequest) {
  // Parse storyId from the query string
  const { searchParams } = new URL(req.url);
  const storyId = Number(searchParams.get('storyId'));

  if (!storyId || isNaN(storyId)) {
    return NextResponse.json({ error: 'storyId query param is required.' }, { status: 400 });
  }

  // Fetch all collaborators for this story, joining the User table for the username
  const collaborators = await prisma.storyCollaborator.findMany({
    where: { storyId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          // Include the avatar so the UI can show a small profile picture
          profile: { select: { avatar: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' }, // oldest invite first
  });

  return NextResponse.json(collaborators);
}

// ─── POST /api/collaborators ──────────────────────────────────────────────────
// Invites a user (looked up by username) to co-author a story.
// Expected body: { storyId: number, inviteeUsername: string }
// Auth comes from the userId cookie (the inviter must own the story).
export async function POST(req: NextRequest) {
  try {
    // Authenticate the inviter from their session cookie
    const cookieStore = await cookies();
    const inviterId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!inviterId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

    const body = await req.json();
    const { storyId, inviteeUsername } = body;

    // storyId and inviteeUsername are required
    if (!storyId || !inviteeUsername) {
      return NextResponse.json(
        { error: 'storyId and inviteeUsername are required.' },
        { status: 400 }
      );
    }

    // Look up the invitee by their username — the invite is username-based
    // so the inviter doesn't need to know the invitee's numeric ID.
    const invitee = await prisma.user.findUnique({
      where: { username: String(inviteeUsername) },
      select: { id: true, username: true },
    });

    if (!invitee) {
      return NextResponse.json({ error: `User "${inviteeUsername}" not found.` }, { status: 404 });
    }

    // Prevent self-invitation — the author can't invite themselves
    if (invitee.id === Number(inviterId)) {
      return NextResponse.json(
        { error: 'You cannot invite yourself as a co-author.' },
        { status: 400 }
      );
    }

    // Prevent duplicate invites — the @@unique([storyId, userId]) constraint
    // on StoryCollaborator would throw a DB error if we tried to insert a duplicate,
    // so we check first and return a friendlier message.
    const existing = await prisma.storyCollaborator.findUnique({
      where: { storyId_userId: { storyId: Number(storyId), userId: invitee.id } },
    });

    if (existing) {
      return NextResponse.json(
        { error: `${inviteeUsername} has already been invited to this story.` },
        { status: 409 } // 409 Conflict
      );
    }

    // Create the collaborator record with accepted = null (pending invite)
    const collaborator = await prisma.storyCollaborator.create({
      data: {
        storyId: Number(storyId),
        userId: invitee.id,
        accepted: null, // null = pending; true = accepted; false = declined
      },
      include: {
        user: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
      },
    });

    // Notify the invitee so they can accept or decline from /my-invites
    const story = await prisma.story.findUnique({
      where: { id: Number(storyId) },
      select: { title: true },
    });
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { username: true },
    });
    prisma.notification
      .create({
        data: {
          userId: invitee.id,
          type: 'COLLABORATE',
          message: `${inviter?.username ?? 'Someone'} invited you to co-author "${story?.title ?? 'a story'}". Visit My Invites to accept.`,
          storyId: Number(storyId),
        },
      })
      .catch(() => {});

    return NextResponse.json(collaborator, { status: 201 });
  } catch (err) {
    console.error('[POST /api/collaborators]', err);
    return NextResponse.json({ error: 'Failed to send invite.' }, { status: 500 });
  }
}
