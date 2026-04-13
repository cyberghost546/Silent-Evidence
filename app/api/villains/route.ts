// app/api/villains/route.ts
// Handles fetching villains nominated for the current week (GET)
// and nominating a new villain (POST).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── Helper: get the Monday (start) and Sunday (end) of the current week ──────
// All dates are normalised to midnight UTC so range queries work correctly.
function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();

  // getDay() returns 0=Sunday … 6=Saturday; we want Monday=0 so we shift
  const dayOfWeek = now.getDay(); // 0 (Sun) – 6 (Sat)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // days back to Monday

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setUTCHours(0, 0, 0, 0); // snap to midnight UTC

  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday = Monday + 6
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

// ─── GET /api/villains ────────────────────────────────────────────────────────
// Returns all villains nominated during the current week, ordered by
// vote count descending so the leader card appears first.
export async function GET() {
  const { start, end } = getCurrentWeekRange();

  // Fetch villains whose weekOf falls within this Monday–Sunday window
  const villains = await prisma.villain.findMany({
    where: {
      weekOf: {
        gte: start, // greater than or equal to Monday midnight
        lte: end,   // less than or equal to Sunday 23:59
      },
    },
    include: {
      // Pull in every vote row so we can count and expose the voter IDs
      votes: {
        select: {
          userId: true, // used by the client to know if the current user voted
        },
      },
    },
    orderBy: {
      // Prisma can order by relation count using _count
      votes: { _count: 'desc' },
    },
  });

  // Shape each villain: replace the raw votes array with a simple count
  // and keep the voter userId list so the client can detect the user's own vote.
  const shaped = villains.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    storyId: v.storyId,
    weekOf: v.weekOf,
    createdAt: v.createdAt,
    voteCount: v.votes.length,          // total number of votes
    voterIds: v.votes.map((vt) => vt.userId), // list of user IDs who voted
  }));

  return NextResponse.json(shaped);
}

// ─── POST /api/villains ───────────────────────────────────────────────────────
// Nominates a new villain for the current week.
// Expected body: { name: string, description?: string, storyId?: number, userId: number }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, storyId, userId } = body;

    // name and userId are required; the rest are optional
    if (!name || !userId) {
      return NextResponse.json(
        { error: 'name and userId are required.' },
        { status: 400 }
      );
    }

    // weekOf is always set to the start of the current week (Monday midnight UTC)
    const { start: weekOf } = getCurrentWeekRange();

    // Create the villain record; storyId is optional — pass undefined if absent
    const villain = await prisma.villain.create({
      data: {
        name: String(name),
        description: description ? String(description) : undefined,
        storyId: storyId ? Number(storyId) : undefined,
        weekOf,
      },
    });

    return NextResponse.json(villain, { status: 201 });
  } catch (err) {
    console.error('[POST /api/villains]', err);
    return NextResponse.json({ error: 'Failed to nominate villain.' }, { status: 500 });
  }
}
