// app/api/battles/[id]/vote/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles POST /api/battles/[id]/vote — casting or changing a vote
// in a specific Story Battle.
//
// Rules enforced by this endpoint:
//   - Both userId and votedFor must be provided in the request body.
//   - The battle must exist, be active, and not have passed its end date.
//   - votedFor must be one of the two stories participating in this battle.
//   - Each user gets exactly one vote per battle (enforced by a DB unique constraint).
//     If they vote again, their previous vote is overwritten (upsert = update or insert).
//
// After recording the vote, the endpoint returns fresh vote counts so the client
// can immediately update the percentage bars without a separate fetch.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import the Prisma database client to query battles and manage vote records
import { prisma } from '@/lib/prisma';

// Next.js App Router passes dynamic route segment values (the [id] in the file path)
// through a params object that is now a Promise in Next.js 15+, so we declare it as such.
type Props = { params: Promise<{ id: string }> };

// ─── POST /api/battles/[id]/vote ─────────────────────────────────────────────
// "req"     — the incoming request with the vote data in its JSON body
// "params"  — contains the dynamic route segment; { id } is the battle's database ID
export async function POST(req: NextRequest, { params }: Props) {
  // Await the params Promise to get the battle ID string from the URL segment
  const { id } = await params;

  // Convert the string ID from the URL to a proper integer for the database query
  const battleId = Number(id);

  // Read the JSON body — expects: { userId: number, votedFor: number }
  const body = await req.json();

  // Destructure the two required fields from the request body
  const { userId, votedFor } = body;

  // Validate that both required fields are present in the request
  if (!userId || !votedFor) {
    return NextResponse.json(
      { error: 'Missing required fields: userId, votedFor' },
      { status: 400 }
    );
  }

  // Convert userId and votedFor to integers (they may arrive as strings from JSON)
  const userIdNum = Number(userId);
  const votedForNum = Number(votedFor);

  // ── Validate the battle ───────────────────────────────────────────────────
  // Look up the battle by its ID and fetch only the fields we need to validate the vote.
  // select reduces the amount of data returned from the database.
  const battle = await prisma.storyBattle.findUnique({
    where: { id: battleId },
    select: {
      id: true, // the battle's own ID
      active: true, // whether the battle is still enabled
      endsAt: true, // when the battle ends
      storyAId: true, // the ID of the first (left) story
      storyBId: true, // the ID of the second (right) story
    },
  });

  // If no battle exists with this ID, return 404 Not Found
  if (!battle) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  }

  // Reject the vote if the battle is either manually deactivated OR past its end date.
  // active: false means an admin closed it early.
  // endsAt <= now means it expired naturally.
  if (!battle.active || battle.endsAt <= new Date()) {
    return NextResponse.json({ error: 'This battle has ended' }, { status: 400 });
  }

  // Reject votes for any story that isn't one of the two stories in this specific battle.
  // This prevents voting for a completely different story that isn't participating.
  if (votedForNum !== battle.storyAId && votedForNum !== battle.storyBId) {
    return NextResponse.json(
      { error: 'votedFor must be one of the two stories in this battle' },
      { status: 400 }
    );
  }

  // ── Record the vote using upsert ──────────────────────────────────────────
  // Upsert = "update if exists, otherwise insert"
  // The unique key is the (battleId, userId) combination.
  // If this user has never voted in this battle, a new vote record is created.
  // If they already voted, only votedFor is updated — allowing users to change their mind.
  // The @@unique([battleId, userId]) constraint in the schema enforces one vote per user.
  await prisma.battleVote.upsert({
    where: {
      // battleId_userId is the auto-generated name for the @@unique([battleId, userId]) constraint
      battleId_userId: { battleId, userId: userIdNum },
    },
    create: {
      // Fields for a brand-new vote record
      battleId, // which battle this vote belongs to
      userId: userIdNum, // which user is voting
      votedFor: votedForNum, // which story they chose
    },
    update: {
      // Only update the choice if the user is changing their vote
      votedFor: votedForNum,
    },
  });

  // ── Re-tally votes to return fresh counts ─────────────────────────────────
  // Fetch all votes for this battle — we need fresh data because another user
  // might have voted between when this user loaded the page and when they submitted.
  const votes = await prisma.battleVote.findMany({
    where: { battleId }, // only votes for this battle
    select: { votedFor: true, userId: true }, // only fetch what we need
  });

  // Count how many votes went to story A
  const votesForA = votes.filter((v) => v.votedFor === battle.storyAId).length;

  // Count how many votes went to story B
  const votesForB = votes.filter((v) => v.votedFor === battle.storyBId).length;

  // Total votes in this battle (A + B)
  const totalVotes = votesForA + votesForB;

  // Return the fresh vote breakdown so the client can update the UI immediately.
  // This avoids a second fetch and reduces perceived latency.
  return NextResponse.json({
    battleId, // echo back the battle ID for context
    totalVotes, // combined vote count across both stories

    storyA: {
      id: battle.storyAId, // story A's database ID
      votes: votesForA, // how many votes story A has received

      // Percentage: (votesForA / total) * 100, rounded to one decimal.
      // Math.round(x * 1000) / 10 gives one decimal place (e.g. 66.7).
      // Default 50% if no votes exist yet (avoids division by zero).
      pct: totalVotes > 0 ? Math.round((votesForA / totalVotes) * 1000) / 10 : 50,
    },

    storyB: {
      id: battle.storyBId, // story B's database ID
      votes: votesForB,
      pct: totalVotes > 0 ? Math.round((votesForB / totalVotes) * 1000) / 10 : 50,
    },

    // Include the raw vote list so the client can detect the current user's pick
    // and highlight their selected story in the UI
    votes,
  });
}
