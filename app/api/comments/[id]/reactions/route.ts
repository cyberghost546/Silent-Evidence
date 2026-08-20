// app/api/comments/[id]/reactions/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles emoji reactions on a single comment (identified by [id]):
//
//   GET  /api/comments/[id]/reactions — returns the aggregated reaction counts
//                                        for each emoji, plus which emojis the
//                                        current user has already reacted with.
//
//   POST /api/comments/[id]/reactions — toggles a specific emoji reaction for
//                                        the current user. If the user hasn't
//                                        reacted with that emoji, the reaction is
//                                        added. If they already reacted, it's removed.
//
// Example: a comment might have 3 x "👍", 1 x "😱", and 2 x "🔥".
// The current logged-in user may have added "😱" and "🔥" already.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to query and manage comment reaction records
import { prisma } from '@/lib/prisma';

// Next.js App Router passes dynamic route segments (e.g. [id]) through a params Promise.
// We declare the type so TypeScript knows the shape of the resolved params object.
type Params = { params: Promise<{ id: string }> };

// ── Helper: read the logged-in user's ID from the session cookie ──────────────
// Returns the userId as a number, or null if the user is not logged in.
// Centralised here so both GET and POST use the same logic without repetition.
async function getUserId() {
  // Access the request's cookie store
  const c = await cookies();

  // Retrieve the 'userId' cookie value; fall back to 0 if missing.
  // Number() converts the string to an integer.
  // || null converts 0 (no cookie) to null — making it easier to do null checks.
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── GET /api/comments/[id]/reactions ─────────────────────────────────────────
// Returns aggregated reaction counts plus the current user's own reactions.
// Response shape: { counts: { "😱": 3, "👍": 1 }, mine: ["😱"] }
//   - counts — an object where each key is an emoji string and the value is the total count
//   - mine   — an array of emoji strings the current user has reacted with (empty for guests)
export async function GET(req: NextRequest, { params }: Params) {
  // Await the params Promise to get the comment ID string from the URL segment
  const { id } = await params;

  // Convert the URL string to an integer for the database query
  const commentId = Number(id);

  // Read the current user's ID (may be null for guests — that's fine here)
  const userId = await getUserId();

  // ── Aggregate reaction counts by emoji ────────────────────────────────────
  // groupBy groups all reaction rows by their emoji field and counts them.
  // This is equivalent to SQL: SELECT emoji, COUNT(*) FROM commentReaction
  //                             WHERE commentId = ? GROUP BY emoji
  // Group reactions by emoji and count them
  const grouped = await prisma.commentReaction.groupBy({
    by: ['emoji'],                // group all rows that share the same emoji value
    where: { commentId },         // only count reactions for this specific comment
    _count: { emoji: true },      // count how many rows each emoji group has
  });

  // Transform the grouped array into a plain object { emoji: count, ... }
  // Object.fromEntries() converts an array of [key, value] pairs into an object.
  // grouped.map returns [ ["😱", 3], ["👍", 1] ] which fromEntries turns into { "😱": 3, "👍": 1 }
  const counts = Object.fromEntries(grouped.map(g => [g.emoji, g._count.emoji]));

  // ── Fetch the current user's own reactions ────────────────────────────────
  // Which emojis has the current user reacted with?
  // If the user is a guest (userId is null), we skip the DB query and use an empty array.
  const mine = userId
    ? // User is logged in — find all their reactions on this specific comment
      (await prisma.commentReaction.findMany({
        where: {
          commentId, // filter to this comment
          userId,    // filter to the logged-in user
        },
        select: { emoji: true }, // we only need the emoji string, not the full row
      })).map(r => r.emoji)      // extract just the emoji string from each record
    : []; // Guest users have no reactions — return an empty array

  // Return the combined result as JSON
  return NextResponse.json({ counts, mine });
}

// ── POST /api/comments/[id]/reactions — body: { emoji } ──────────────────────
// Toggles an emoji reaction for the logged-in user on this specific comment.
// If the reaction doesn't exist, it's created (action: "added").
// If it already exists, it's deleted (action: "removed").
// POST /api/comments/[id]/reactions — body: { emoji }
// Adds the reaction if not present, removes it if it is (toggle)
export async function POST(req: NextRequest, { params }: Params) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Only logged-in users can add or remove reactions
  const userId = await getUserId();

  // If userId is null, the user is not logged in — reject with 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Await the params Promise to get the comment ID string from the URL segment
  const { id } = await params;

  // Convert the URL string to an integer for the database query
  const commentId = Number(id);

  // Parse the JSON body — expects { emoji: string }
  const { emoji } = await req.json();

  // Validate that emoji was provided and is a string (prevents null/number submissions)
  if (!emoji || typeof emoji !== 'string') {
    return NextResponse.json({ error: 'emoji required' }, { status: 400 });
  }

  // ── Toggle logic ──────────────────────────────────────────────────────────
  // Check if this exact reaction (same comment + user + emoji) already exists.
  // The composite unique constraint commentId_userId_emoji in the schema means
  // each user can only react to a comment once with each specific emoji.
  // Check if this reaction already exists
  const existing = await prisma.commentReaction.findUnique({
    where: {
      // commentId_userId_emoji is the auto-generated name for the @@unique constraint
      // in the schema: @@unique([commentId, userId, emoji])
      commentId_userId_emoji: { commentId, userId, emoji },
    },
  });

  // If a reaction record already exists for this user + emoji combination...
  if (existing) {
    // Toggle off — remove the reaction
    // ...delete it (the user is "un-reacting")
    await prisma.commentReaction.delete({
      where: {
        // Use the same composite key to target exactly this reaction record
        commentId_userId_emoji: { commentId, userId, emoji },
      },
    });

    // Inform the client the reaction was removed so it can update the UI counter
    return NextResponse.json({ action: 'removed' });

  } else {
    // Toggle on — add the reaction
    // No existing reaction found — create a new one (the user is reacting for the first time)
    await prisma.commentReaction.create({
      data: {
        commentId, // which comment is being reacted to
        userId,    // which user is adding the reaction
        emoji,     // the stored reaction id they chose (see lib/reactions)
      },
    });

    // Inform the client the reaction was added so it can increment the counter
    return NextResponse.json({ action: 'added' });
  }
}
