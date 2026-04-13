// POST /api/reading-rooms — creates a new reading room for a story
// GET  /api/reading-rooms?code=XXXX — looks up a room by its join code

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Generates a random 6-character uppercase join code e.g. "GHOST7"
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { storyId } = await req.json();
  if (!storyId) return NextResponse.json({ error: 'storyId required' }, { status: 400 });

  // Generate a unique code — retry if collision (unlikely but safe)
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const exists = await prisma.readingRoom.findUnique({ where: { code } });
    if (!exists) break;
    code = generateCode();
    attempts++;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });

  // Create the room and add the host as the first member
  const room = await prisma.readingRoom.create({
    data: {
      code,
      storyId,
      hostId: userId,
      members: {
        create: { userId, username: user?.username ?? 'Host', progress: 0 },
      },
    },
  });

  return NextResponse.json({ code: room.code, roomId: room.id });
}

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const room = await prisma.readingRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { members: true },
  });

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  return NextResponse.json(room);
}
