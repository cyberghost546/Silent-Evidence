// PATCH /api/reading-rooms/[code] — join a room or update a member's progress
// Body: { action: 'join' | 'progress', progress?: number }

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { pushRoomUpdate } from '@/lib/pusher';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { action, progress } = await req.json();

  const room = await prisma.readingRoom.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });

  if (action === 'join') {
    // Add member if not already in the room (upsert = create or update)
    await prisma.readingRoomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      create: { roomId: room.id, userId, username: user?.username ?? 'Reader', progress: 0 },
      update: { lastSeen: new Date() },
    });
  }

  if (action === 'progress' && progress !== undefined) {
    // Update scroll progress (0-100) and lastSeen timestamp
    await prisma.readingRoomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      create: { roomId: room.id, userId, username: user?.username ?? 'Reader', progress },
      update: { progress, lastSeen: new Date() },
    });
  }

  // Return current room state with all active members (seen in last 5 minutes)
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const members = await prisma.readingRoomMember.findMany({
    where: { roomId: room.id, lastSeen: { gte: fiveMinsAgo } },
    select: { userId: true, username: true, progress: true },
  });

  // Push the updated member list to all clients in the room via Pusher WebSocket
  // If Pusher isn't configured, this is a no-op and clients fall back to polling
  pushRoomUpdate(code.toUpperCase(), members);

  return NextResponse.json({ members });
}
