// ============================================================
//  GET  /api/squads?userId=X  — list all squads a user belongs to
//  POST /api/squads            — create a new squad
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Generates a random 6-character uppercase invite code e.g. "CRYPT7"
// Uses base-36 random string sliced to 6 chars then uppercased
function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// GET /api/squads?userId=X
// Returns every squad the given user is a member of,
// including member count and the host's username for display
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get('userId'));

  // userId is required — return 400 if missing or non-numeric
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  // Find all SquadMember rows for this user, then include the parent Squad
  const memberships = await prisma.squadMember.findMany({
    where: { userId },
    include: {
      squad: {
        include: {
          // Count members by fetching the full member list (small squads, fine in practice)
          members: { select: { id: true } },
          // Include host info so the UI can show who created the squad
          host: { select: { username: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  // Reshape each membership into a flat squad object the client can render easily
  const squads = memberships.map(({ squad }) => ({
    id: squad.id,
    name: squad.name,
    code: squad.code,
    description: squad.description,
    hostUsername: squad.host.username,
    memberCount: squad.members.length,
    createdAt: squad.createdAt,
  }));

  return NextResponse.json({ squads });
}

// POST /api/squads
// Body: { name, description, hostId }
// Creates a new squad with a unique invite code and auto-adds the host as member
export async function POST(req: Request) {
  const body = await req.json();
  const { name, description, hostId } = body;

  // Validate required fields
  if (!name || !hostId) {
    return NextResponse.json({ error: 'name and hostId are required' }, { status: 400 });
  }

  // Generate a unique code — retry up to 5 times on the rare collision
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.squad.findUnique({ where: { code } });
    if (!existing) break; // Code is available, exit loop
    code = generateCode();
    attempts++;
  }

  // Create the squad and simultaneously add the host as the first member
  // using Prisma's nested create so it happens in one transaction
  const squad = await prisma.squad.create({
    data: {
      name,
      description: description ?? null,
      code,
      hostId,
      members: {
        // Auto-enroll the host so they appear in their own squad
        create: { userId: hostId },
      },
    },
    include: {
      members: { select: { id: true } },
      host: { select: { username: true } },
    },
  });

  return NextResponse.json({
    id: squad.id,
    name: squad.name,
    code: squad.code,
    description: squad.description,
    hostUsername: squad.host.username,
    memberCount: squad.members.length,
    createdAt: squad.createdAt,
  });
}
