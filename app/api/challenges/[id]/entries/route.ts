// app/api/challenges/[id]/entries/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles POST /api/challenges/[id]/entries — submitting a story
// as an entry to a specific writing challenge.
//
// Rules enforced by this endpoint:
//   1. The user must be logged in.
//   2. The challenge must exist and currently be active (accepting submissions).
//   3. The story being submitted must be published AND owned by the caller —
//      you cannot enter someone else's story.
//   4. Each user may only submit one entry per challenge — a second submission
//      returns a 409 Conflict because the database has a unique constraint on
//      (challengeId, userId).
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to validate challenges, stories, and create entries
import { prisma } from '@/lib/prisma';

// Next.js App Router passes dynamic URL segment values through a params Promise.
// { id } in the type refers to the [id] segment in the file path.
type Props = { params: Promise<{ id: string }> };

// ── Helper: read the logged-in user's ID from the session cookie ──────────────
// Returns a number (the userId) or null if the user isn't logged in.
async function getUserId() {
  const c = await cookies();
  // Number() converts the string cookie value to an integer.
  // ?? 0 fallback means Number(undefined) = NaN, so we use ?? 0 instead.
  // || null converts 0 (missing cookie) to null for a clean falsy check.
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── POST handler ──────────────────────────────────────────────────────────────
// "req"    — the incoming request with storyId in its JSON body
// "params" — contains the challenge ID from the URL (e.g. /api/challenges/7/entries)
export async function POST(req: NextRequest, { params }: Props) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Only logged-in users can enter a challenge — guests can't submit
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Await the params Promise to get the challenge ID string from the URL
  const { id } = await params;

  // Convert the URL string to an integer for the database query
  const challengeId = Number(id);

  // Parse the JSON body — expects { storyId: number }
  const { storyId } = await req.json();

  // ── Validate the challenge ─────────────────────────────────────────────────
  // Look up the challenge record to ensure it exists and is still accepting submissions
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });

  // If the challenge doesn't exist OR is not active (paused by admin), reject the entry
  if (!challenge || !challenge.active) return NextResponse.json({ error: 'Challenge not found or closed' }, { status: 404 });

  // ── Validate the story ────────────────────────────────────────────────────
  // Look up the story to verify ownership and publication status.
  // We only select authorId and status — those are the only fields we need for validation.
  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true, status: true } });

  // If the story doesn't exist, or if the caller isn't the author, reject the submission.
  // story.authorId !== userId prevents entering someone else's story in your name.
  if (!story || story.authorId !== userId) return NextResponse.json({ error: 'You can only submit your own published stories' }, { status: 403 });

  // Only published stories are allowed — drafts are not visible to challenge voters anyway
  if (story.status !== 'PUBLISHED') return NextResponse.json({ error: 'Story must be published' }, { status: 400 });

  try {
    // ── Create the entry ──────────────────────────────────────────────────────
    // Insert a new ChallengeEntry record linking the challenge, story, and user.
    // The database has a unique constraint on (challengeId, userId), meaning if this
    // user already has an entry for this challenge, Prisma will throw an error.
    const entry = await prisma.challengeEntry.create({ data: { challengeId, storyId, userId } });

    // Return 201 Created with the newly created entry record
    return NextResponse.json(entry, { status: 201 });

  } catch {
    // If Prisma throws here, it's almost certainly a unique constraint violation —
    // meaning this user already submitted an entry to this challenge.
    return NextResponse.json({ error: 'Already submitted an entry' }, { status: 409 });
  }
}
