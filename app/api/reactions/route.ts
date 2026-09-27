// ============================================================
//  app/api/reactions/route.ts
//
//  POST /api/reactions
//
//  Toggles an emoji reaction on a story for the currently logged-in user.
//
//  Available reaction types:
//    LOVE    — heart/love reaction
//    HYPE    — excitement/hype reaction
//    KAWAII  — cute/kawaii reaction
//    FIRE    — fire/hot reaction
//
//  Rules:
//    - Each user can have AT MOST ONE reaction per story at a time.
//    - Clicking the same reaction again removes it (toggle off).
//    - Clicking a different reaction replaces the existing one.
//      (Remove the old reaction, then add the new one.)
//
//  Returns:
//    { reacted: boolean, counts: { LOVE: n, HYPE: n, ... } }
//    reacted — true if the user now has this reaction, false if removed
//    counts  — updated totals for every reaction type on this story
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── POST handler ──────────────────────────────────────────────────────────────
// Handles toggling or switching a story reaction.
// Expected JSON body: { storyId: number, type: "LOVE" | "HYPE" | "KAWAII" | "FIRE" }
export async function POST(req: Request) {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID from the session cookie
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to react to a story
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the JSON body to get the story and reaction type
  const { storyId, type } = await req.json();

  // The list of valid reaction type strings — must match the Reaction model's enum
  const VALID = ['LOVE', 'HYPE', 'KAWAII', 'FIRE'];

  // Validate: storyId must be provided AND type must be one of the allowed strings
  if (!storyId || !VALID.includes(type))
    return NextResponse.json({ error: 'Invalid.' }, { status: 400 });

  // Convert storyId to a number — it may arrive as a string from some clients
  const sid = Number(storyId);

  // ── Check for an existing reaction from this user on this story ──────────────
  // The Reaction table has a @@unique([userId, storyId, type]) constraint.
  // We look for THIS user + THIS story + THIS exact type.
  const existing = await prisma.reaction.findUnique({
    where: {
      // Composite unique key: userId + storyId + type
      userId_storyId_type: { userId, storyId: sid, type },
    },
  });

  if (existing) {
    // The user already has this exact reaction on this story.
    // Clicking the same emoji again should remove it (toggle off).
    await prisma.reaction.delete({
      where: { id: existing.id },
    });
    // After removal, `existing` is truthy so `reacted: !existing` → false (see return below)
  } else {
    // The user is adding a new reaction (or switching from a different one).

    // First, delete any OTHER reaction this user has on this story.
    // Only one reaction type is allowed per user per story.
    // deleteMany handles the case where no other reaction exists (deletes 0 rows safely).
    await prisma.reaction.deleteMany({
      where: {
        // Target any reaction from this user on this story regardless of type
        userId,
        storyId: sid,
      },
    });

    // Then create the new reaction
    await prisma.reaction.create({
      data: {
        // Who reacted
        userId,
        // Which story was reacted to
        storyId: sid,
        // Which emoji type was clicked
        type,
      },
    });
  }

  // ── Fetch updated reaction counts ────────────────────────────────────────────
  // groupBy groups all reaction rows by their `type` field and counts each group.
  // This gives us: [{ type: "LOVE", _count: { type: 3 } }, { type: "FIRE", _count: { type: 1 } }]
  const counts = await prisma.reaction.groupBy({
    by: ['type'],
    // Only count reactions on THIS story
    where: { storyId: sid },
    // Count the number of rows in each type group
    _count: { type: true },
  });

  // Convert the array of grouped results into a plain object.
  // e.g. { LOVE: 3, FIRE: 1, HYPE: 0 }
  // Object.fromEntries turns [["LOVE", 3], ["FIRE", 1]] into { LOVE: 3, FIRE: 1 }
  const result = Object.fromEntries(counts.map((c) => [c.type, c._count.type]));

  // Return:
  //   reacted — !existing is true when we ADDED the reaction (existing was null),
  //             false when we REMOVED it (existing was found and deleted)
  //   counts  — the current reaction totals for all types
  return NextResponse.json({ reacted: !existing, counts: result });
}
