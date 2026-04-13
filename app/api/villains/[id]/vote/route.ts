// app/api/villains/[id]/vote/route.ts
// Toggle a vote for a nominated villain.
// One vote per user per villain — voting again removes the existing vote.
// Returns { voted: boolean, totalVotes: number }

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  // Next.js 15+ requires params to be awaited — it is now a Promise
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before reading segments (required in Next.js 15+)
    const { id } = await params;
    const villainId = Number(id);
    if (isNaN(villainId)) {
      return NextResponse.json({ error: 'Invalid villain id.' }, { status: 400 });
    }

    // Parse the voter's userId from the request body
    const body = await req.json();
    const userId = Number(body?.userId);
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    // Check if this user has already voted for this villain.
    // The VillainVote table has a @@unique([villainId, userId]) constraint
    // so there can be at most one row per (villain, user) pair.
    const existing = await prisma.villainVote.findUnique({
      where: {
        villainId_userId: { villainId, userId },
      },
    });

    if (existing) {
      // ── Un-vote: remove the existing vote row ─────────────────────────────
      await prisma.villainVote.delete({ where: { id: existing.id } });

      // Re-count the remaining votes for this villain
      const totalVotes = await prisma.villainVote.count({ where: { villainId } });
      return NextResponse.json({ voted: false, totalVotes });
    }

    // ── Vote: insert a new vote row ────────────────────────────────────────
    await prisma.villainVote.create({
      data: { villainId, userId },
    });

    // Count total votes after adding the new one
    const totalVotes = await prisma.villainVote.count({ where: { villainId } });
    return NextResponse.json({ voted: true, totalVotes });
  } catch (err) {
    console.error('[POST /api/villains/[id]/vote]', err);
    return NextResponse.json({ error: 'Failed to toggle vote.' }, { status: 500 });
  }
}
