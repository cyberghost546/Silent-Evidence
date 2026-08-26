// app/api/challenges/[id]/entries/vote/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles POST /api/challenges/[id]/entries/vote — casting a vote for
// a specific entry in a writing challenge.
//
// Rules enforced by this endpoint:
//   1. The user must be logged in.
//   2. The entry being voted on must actually exist.
//   3. Users cannot vote for their own challenge entry — that would be unfair.
//   4. Each vote increments the entry's vote counter by exactly 1.
//
// NOTE: This endpoint intentionally does NOT prevent a user from voting multiple
// times. If you want one-vote-per-user behaviour, a database unique constraint on
// (entryId, userId) would need to be added.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to query challenge entries and record votes
import { prisma } from '@/lib/prisma';

// Next.js App Router passes dynamic URL segment values (e.g. [id]) through a params
// Promise — we declare the type so TypeScript knows the shape of the object.
type Props = { params: Promise<{ id: string }> };

// ── Helper: read the logged-in user's ID from the session cookie ──────────────
// Returns the userId as a number, or null if the user is not logged in.
// This is a small reusable function so we don't repeat cookie-reading logic.
async function getUserId() {
  // Access the request's cookie store
  const c = await cookies();

  // Retrieve the 'userId' cookie value; fall back to 0 if the cookie is missing.
  // Number() converts the string cookie value to an integer.
  // || null converts 0 (the fallback for a missing cookie) to null for a clean falsy check.
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/challenges/[id]/entries/vote.
// "req"    — the incoming request; the JSON body contains { entryId }
// "params" — contains the challenge ID from the URL segment [id]
export async function POST(req: NextRequest, { params }: Props) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Identify the requesting user — only logged-in users may vote
  const userId = await getUserId();

  // If userId is null (not logged in), reject with 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Extract the challenge ID from the URL ─────────────────────────────────
  // Await the params Promise to read the [id] segment from the URL
  // e.g. for /api/challenges/7/entries/vote, id will be "7"
  const { id } = await params;

  // Convert the URL string segment to an integer for the database query
  const challengeId = Number(id);

  // ── Parse the request body ────────────────────────────────────────────────
  // Read the JSON body from the request — expects { entryId: number }
  const { entryId } = await req.json();

  // ── Self-vote prevention: check if the user submitted this entry ──────────
  // Look up whether this user has their own entry in this challenge.
  // We use findUnique with the composite unique constraint name (challengeId_userId).
  // This returns null if the user hasn't submitted an entry at all.
  const userEntry = await prisma.challengeEntry.findUnique({
    where: {
      // challengeId_userId is the auto-generated name for the @@unique([challengeId, userId])
      // constraint defined in the Prisma schema — it uniquely identifies one entry per user per challenge
      challengeId_userId: { challengeId, userId },
    },
  });

  // Note: userEntry is fetched but the self-vote check is enforced below on the
  // fetched entry record (entry.userId === userId). The userEntry variable is
  // available here for any additional checks needed in future.

  // ── Validate the entry ────────────────────────────────────────────────────
  // Look up the challenge entry by its own unique ID (the entry's primary key, not the challenge ID)
  const entry = await prisma.challengeEntry.findUnique({
    where: { id: entryId },
  });

  // If the entry doesn't exist in the database, return 404 Not Found
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

  // If the entry belongs to the requesting user, block the vote —
  // authors cannot vote for their own submissions
  if (entry.userId === userId) {
    return NextResponse.json({ error: "Can't vote for your own entry" }, { status: 400 });
  }

  // ── Record the vote ───────────────────────────────────────────────────────
  // Increment the votes counter on this entry by 1.
  // Using { increment: 1 } instead of reading the current value and writing value+1
  // is safer in high-traffic situations — Prisma generates an atomic SQL UPDATE
  // which prevents a race condition if two votes arrive at the same moment.
  await prisma.challengeEntry.update({
    where: { id: entryId }, // target this specific entry by its primary key
    data: {
      votes: { increment: 1 }, // atomically add 1 to the current vote count
    },
  });

  // Return 200 OK — the vote was recorded successfully
  return NextResponse.json({ ok: true });
}
