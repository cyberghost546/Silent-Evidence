// ============================================================
//  app/api/polls/[pollId]/vote/route.ts
//
//  POST /api/polls/:pollId/vote
//
//  Casts, switches, or removes a vote on a poll.
//
//  Three scenarios:
//    1. User votes for an option they haven't voted for yet
//         → Creates a new PollVote row.
//    2. User votes for the SAME option they already voted for
//         → Removes their vote (toggle off).
//    3. User votes for a DIFFERENT option than their current vote
//         → Updates their vote to the new option.
//
//  After the vote change, fresh vote counts are returned so the
//  client can immediately update the results bar without re-fetching.
//
//  Validation checks:
//    - Caller must be logged in
//    - Poll must exist
//    - Poll must not be closed (endsAt in the past)
//    - The chosen optionId must belong to this poll
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Type for the dynamic route params.
// pollId is the numeric ID of the poll to vote on.
// params is a Promise in Next.js App Router — must be awaited before reading.
type Params = { params: Promise<{ pollId: string }> };

// ── POST handler ──────────────────────────────────────────────────────────────
// Handles casting/switching/removing a vote on the specified poll.
// req    — the incoming HTTP request; JSON body must include { optionId: number }
// params — dynamic route segment { pollId: string }
export async function POST(req: Request, { params }: Params) {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Get the logged-in user's ID — only logged-in users may vote
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Guests cannot vote
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Await the params Promise and read the pollId string from the URL
  const { pollId: pollIdStr } = await params;

  // Convert the string pollId from the URL to a number for Prisma
  const pollId = Number(pollIdStr);

  // Parse the JSON body to get the answer option the user clicked
  const { optionId } = await req.json();

  // ── Validate the poll exists and is still open ───────────────────────────────
  // Fetch the poll to check its close date and to verify the option belongs to it
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      // We need the id to check if it exists
      id: true,
      // endsAt lets us check whether the poll has closed
      endsAt: true,
      // authorId is selected but not used here (available for future moderation checks)
      authorId: true,
      // Fetch all option IDs so we can verify the submitted optionId is valid for THIS poll
      options: { select: { id: true } },
    },
  });

  // Return 404 if the poll doesn't exist
  if (!poll) return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });

  // Return 400 if the poll has a close date that has already passed.
  // poll.endsAt < new Date() means the close time is in the past.
  if (poll.endsAt && poll.endsAt < new Date()) {
    return NextResponse.json({ error: 'This poll has closed.' }, { status: 400 });
  }

  // Verify the option belongs to this specific poll.
  // A user shouldn't be able to vote with an optionId from a different poll.
  // .find() returns undefined if no option matches — truthy check ensures it's valid.
  if (!poll.options.find((o) => o.id === optionId)) {
    return NextResponse.json({ error: 'Invalid option.' }, { status: 400 });
  }

  // ── Check for an existing vote from this user on this poll ──────────────────
  // The PollVote table has a @@unique([pollId, userId]) constraint — one vote per user per poll.
  const existing = await prisma.pollVote.findUnique({
    where: {
      // Composite unique key: pollId + userId
      pollId_userId: { pollId, userId },
    },
  });

  if (existing) {
    // The user has already voted on this poll — decide whether to toggle or switch

    if (existing.optionId === optionId) {
      // Scenario 2: Same option clicked again — remove the vote (toggle off)
      await prisma.pollVote.delete({ where: { id: existing.id } });
    } else {
      // Scenario 3: Different option clicked — switch the vote to the new option
      await prisma.pollVote.update({
        where: { id: existing.id },
        data: { optionId },
      });
    }
  } else {
    // Scenario 1: No existing vote — create a fresh vote row
    await prisma.pollVote.create({
      data: {
        // Link to this poll
        pollId,
        // Link to the chosen answer option
        optionId,
        // Record who voted
        userId,
      },
    });
  }

  // ── Return fresh vote counts ─────────────────────────────────────────────────
  // Refetch the poll's vote data so the client can update the result bars immediately.
  // We return counts per option AND whether this user voted for each, so the UI
  // knows which bar to highlight.
  const updated = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      // Total votes across all options for the poll header
      _count: { select: { votes: true } },
      // Per-option vote data
      options: {
        select: {
          // Option ID so the client can match to the right bar
          id: true,
          // How many votes this option has now
          _count: { select: { votes: true } },
          // Whether THIS user has voted for this option (for highlighting)
          votes: { where: { userId }, select: { id: true } },
        },
      },
    },
  });

  // Return the updated poll vote state so the client can re-render immediately
  return NextResponse.json(updated);
}
