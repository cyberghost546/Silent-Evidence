// ============================================================
//  app/api/quiz/route.ts
//
//  Manages horror knowledge quiz attempts and the leaderboard.
//
//  POST /api/quiz
//    → Saves a completed quiz attempt for the logged-in user.
//      Records the score (correct answers) and total (questions shown).
//      Requires login.
//
//  GET  /api/quiz
//    → Returns the top 10 all-time quiz scores across all users,
//      sorted by highest score first, then by earliest completion
//      time (so ties go to the first person who achieved that score).
//      Public — no login required to view the leaderboard.
// ============================================================

// Import NextRequest (typed request) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── Helper: read the logged-in user's ID from the session cookie ──────────────
// Returns the numeric userId, or null if the user is not logged in.
async function getUserId() {
  // Await the cookie store (required in Next.js App Router server context)
  const c = await cookies();
  // Convert the cookie value to a number; return null if missing or zero
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── POST /api/quiz ─────────────────────────────────────────────────────────────
// Saves a quiz attempt after the user completes the quiz.
// Expected JSON body: { score: number, total: number }
export async function POST(req: NextRequest) {
  // Check whether the user is logged in
  const userId = await getUserId();

  // Guests cannot save quiz attempts
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse the JSON body to get the quiz results
  const { score, total } = await req.json();

  // Both score and total must be numbers.
  // typeof checks guard against null, undefined, or string values that could cause
  // incorrect database writes or calculation errors.
  if (typeof score !== 'number' || typeof total !== 'number') {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
  }

  // Save the quiz attempt to the database.
  // The completedAt timestamp is set automatically by the schema default.
  const attempt = await prisma.quizAttempt.create({
    data: {
      // Link the attempt to the logged-in user
      userId,
      // Number of questions the user answered correctly
      score,
      // Total number of questions in the quiz
      total,
    },
  });

  // Return 201 Created with the saved attempt object
  return NextResponse.json(attempt, { status: 201 });
}

// ── GET /api/quiz ──────────────────────────────────────────────────────────────
// Returns the top 10 quiz scores (the leaderboard).
// Public endpoint — no login required to view the leaderboard.
export async function GET() {
  // Fetch the top 10 quiz attempts from the database
  const top = await prisma.quizAttempt.findMany({
    // Two-level sort:
    //   1. score: desc    — highest score first (10/10 beats 9/10)
    //   2. completedAt: asc — among equal scores, earlier time wins
    //      (the first person to achieve that score ranks higher)
    orderBy: [{ score: 'desc' }, { completedAt: 'asc' }],
    // Cap the leaderboard at 10 entries
    take: 10,
    // Include the user's username for the "Name" column on the leaderboard table
    include: { user: { select: { username: true } } },
  });

  // Return the leaderboard array as JSON
  return NextResponse.json(top);
}
