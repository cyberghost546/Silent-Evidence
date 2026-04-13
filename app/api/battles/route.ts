// app/api/battles/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles two endpoints for Story Battles:
//
//   GET  /api/battles — returns all currently active battles with vote tallies
//   POST /api/battles — creates a new battle (admin only)
//
// A Story Battle pits two published stories against each other. Community members
// vote for the story they prefer, and the UI shows live percentage bars.
// Battles have an end date — once expired they're hidden from the active list.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies() helper to read the session cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma database client to query battles, votes, and users
import { prisma } from '@/lib/prisma';

// ─── Helper: resolve whether the current request comes from an admin user ────
// This is an async function because both cookies() and prisma queries are async.
// Returns true if the logged-in user has the ADMIN role, false otherwise.
async function getAdminStatus(): Promise<boolean> {
  // Read the cookie store for this request
  const c = await cookies();

  // Extract userId from the session cookie. The ?. optional chaining handles the
  // case where the cookie doesn't exist. Number() converts the string to an integer.
  // The || null turns a 0 (from a missing cookie) back into null for a clean falsy check.
  const userId = Number(c.get('userId')?.value ?? 0) || null;

  // If no userId in the cookie, the user is not logged in — definitely not an admin
  if (!userId) return false;

  // Look up the user in the database and retrieve only their role
  // (we don't need any other fields for this check)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // Return true only if the role is exactly 'ADMIN'
  return user?.role === 'ADMIN';
}

// ─── GET /api/battles ─────────────────────────────────────────────────────────
// Returns all battles that are still running (active flag is true AND end date is in the future).
// For each battle, the response includes both stories and a precomputed vote breakdown.
// This endpoint is public — no authentication required.
export async function GET() {
  // Capture the current date/time to compare against battle end dates
  const now = new Date();

  // Query the database for active battles that haven't ended yet.
  // active: true     — the admin hasn't manually deactivated this battle
  // endsAt > now     — the end date is still in the future (gt = "greater than")
  // orderBy createdAt desc — most recently created battle appears first
  const battles = await prisma.storyBattle.findMany({
    where: {
      active: true,
      endsAt: { gt: now }, // gt = greater than current time
    },
    orderBy: { createdAt: 'desc' }, // most recently created battle first

    include: {
      // Story A — the left-side story in the VS card UI
      storyA: {
        select: {
          id: true,          // needed to match votes to this story
          title: true,       // displayed as the story name
          slug: true,        // used to build the link to the story page
          coverImage: true,  // displayed as the story's thumbnail image
          author: { select: { username: true } }, // show the author's name below the title
        },
      },

      // Story B — the right-side story in the VS card UI
      storyB: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          author: { select: { username: true } },
        },
      },

      // Include all votes for this battle so we can tally them server-side
      votes: {
        select: {
          votedFor: true, // the storyId the user voted for (A or B)
          userId: true,   // used by the client to highlight the current user's pick
        },
      },
    },
  });

  // Transform each raw battle record into a cleaner shape for the frontend
  const shaped = battles.map((battle) => {
    // Count votes that went to storyA by filtering the votes array
    const votesForA = battle.votes.filter((v) => v.votedFor === battle.storyAId).length;

    // Count votes that went to storyB
    const votesForB = battle.votes.filter((v) => v.votedFor === battle.storyBId).length;

    // Total votes cast across both stories in this battle
    const totalVotes = votesForA + votesForB;

    return {
      id: battle.id,               // unique battle ID
      active: battle.active,       // whether the battle is still running
      endsAt: battle.endsAt,       // when the battle closes (ISO date string)
      createdAt: battle.createdAt, // when the battle was created

      storyA: {
        ...battle.storyA,          // spread all the story fields (id, title, slug, etc.)
        votes: votesForA,          // total votes received by story A

        // Percentage share of total votes, rounded to one decimal place.
        // If no votes yet, default to 50% so both bars appear equal.
        // Math.round(x * 1000) / 10 gives one decimal place, e.g. 66.7
        pct: totalVotes > 0 ? Math.round((votesForA / totalVotes) * 1000) / 10 : 50,
      },

      storyB: {
        ...battle.storyB,          // spread all story B fields
        votes: votesForB,          // total votes received by story B
        pct: totalVotes > 0 ? Math.round((votesForB / totalVotes) * 1000) / 10 : 50,
      },

      totalVotes,   // total votes across both stories combined

      // Include the raw vote list so the client can check if the current user has voted
      votes: battle.votes,
    };
  });

  // Return the shaped battles array as JSON
  return NextResponse.json(shaped);
}

// ─── POST /api/battles ────────────────────────────────────────────────────────
// Creates a new battle. Admin only.
// Expected request body: { storyAId: number, storyBId: number, endsAt: string (ISO date) }
export async function POST(req: NextRequest) {
  // Check admin status — reject if the caller is not an admin
  if (!(await getAdminStatus())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse the JSON body from the request
  const body = await req.json();

  // Destructure the three required fields from the body
  const { storyAId, storyBId, endsAt } = body;

  // All three fields are required to create a valid battle
  if (!storyAId || !storyBId || !endsAt) {
    return NextResponse.json(
      { error: 'Missing required fields: storyAId, storyBId, endsAt' },
      { status: 400 }
    );
  }

  // A story can't be pitted against itself — that wouldn't make sense
  if (Number(storyAId) === Number(storyBId)) {
    return NextResponse.json(
      { error: 'storyAId and storyBId must be different stories' },
      { status: 400 }
    );
  }

  // Parse the endsAt string into a JavaScript Date object
  const endsAtDate = new Date(endsAt);

  // Validate the date is a real date (isNaN catches malformed strings like "not-a-date")
  // and that it's actually in the future (no point creating an already-expired battle)
  if (isNaN(endsAtDate.getTime()) || endsAtDate <= new Date()) {
    return NextResponse.json(
      { error: 'endsAt must be a valid future date' },
      { status: 400 }
    );
  }

  // Create the battle record in the database.
  // active defaults to true in the schema so it appears immediately on the battles page.
  const battle = await prisma.storyBattle.create({
    data: {
      storyAId: Number(storyAId), // cast to number to ensure correct DB type
      storyBId: Number(storyBId),
      endsAt: endsAtDate,         // the parsed Date object
    },
  });

  // Return 201 Created with the new battle record
  return NextResponse.json(battle, { status: 201 });
}
