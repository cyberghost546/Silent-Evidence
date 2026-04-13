// app/api/collaborators/[id]/route.ts
// Handles accepting or declining a co-author invite.
// PATCH /api/collaborators/:id   Body: { accepted: boolean }

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  // Next.js 15+ requires params to be awaited — it is now a Promise
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before reading segments (required in Next.js 15+)
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid collaborator id.' }, { status: 400 });
    }

    // Parse the accepted flag from the request body
    // true = the invitee accepted, false = the invitee declined
    const body = await req.json();
    const { accepted } = body;

    if (typeof accepted !== 'boolean') {
      return NextResponse.json(
        { error: 'accepted must be a boolean (true or false).' },
        { status: 400 }
      );
    }

    // Make sure the collaborator record actually exists before updating
    const existing = await prisma.storyCollaborator.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Collaborator record not found.' }, { status: 404 });
    }

    // Update the accepted field — this changes the status from pending → accepted/declined
    const updated = await prisma.storyCollaborator.update({
      where: { id },
      data: { accepted },
      include: {
        // Include the user info so the response is immediately useful to the client
        user: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/collaborators/[id]]', err);
    return NextResponse.json({ error: 'Failed to update invite.' }, { status: 500 });
  }
}
