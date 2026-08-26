// ============================================================
//  app/api/last-words/[id]/like/route.ts
//
//  POST /api/last-words/:id/like
//
//  Toggles a like on a specific Last Word post.
//
//  Toggle behaviour:
//    - If the user HAS NOT liked this post → add a like
//    - If the user HAS already liked it    → remove the like
//
//  Returns: { liked: boolean, likes: number }
//    liked — the new state after toggling (true = now liked)
//    likes — the updated total like count for this post
//
//  The [id] in the URL is the Last Word post's numeric database ID.
//  The userId is passed in the request body (not from a cookie, since
//  this component is also used client-side where the userId is in state).
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── POST handler ──────────────────────────────────────────────────────────────
// Toggles the like state for the calling user on the given last word.
// req    — the HTTP request containing { userId } in its JSON body
// params — dynamic route segments — contains the last word's id
export async function POST(
  req: Request,
  // Next.js 15+ delivers params as a Promise — we must await before reading
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise before reading the id segment
    const { id } = await params;

    // Convert the string id from the URL to a number for Prisma queries
    const lastWordId = Number(id);

    // Validate that the id is actually a number (catches NaN from non-numeric URLs)
    if (isNaN(lastWordId)) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }

    // Parse the JSON body to get the userId
    const body = await req.json();

    // Convert the userId to a number; it may arrive as a string in some contexts
    const userId = Number(body?.userId);

    // Validate userId — must be a positive integer
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    // Check whether this user has already liked this specific last word.
    // LastWordLike has a @@unique([lastWordId, userId]) constraint in the schema,
    // meaning there can be at most one like per (post, user) combination.
    // findUnique returns the row if it exists, or null if not.
    const existing = await prisma.lastWordLike.findUnique({
      where: {
        // Use the composite unique key — Prisma generates this name from the @@unique constraint
        lastWordId_userId: { lastWordId, userId },
      },
    });

    // ── Unlike branch ───────────────────────────────────────────────────────
    // The user already liked this post — clicking again should remove the like
    if (existing) {
      // Delete the like row by its primary key
      await prisma.lastWordLike.delete({ where: { id: existing.id } });

      // Count the remaining likes after the deletion
      const likes = await prisma.lastWordLike.count({ where: { lastWordId } });

      // Return { liked: false } to signal the heart should appear un-filled
      return NextResponse.json({ liked: false, likes });
    }

    // ── Like branch ─────────────────────────────────────────────────────────
    // No existing like — create a new one
    await prisma.lastWordLike.create({
      data: {
        // Link the like to this last word
        lastWordId,
        // Record who liked it
        userId,
      },
    });

    // Count the total likes after adding the new one
    const likes = await prisma.lastWordLike.count({ where: { lastWordId } });

    // Return { liked: true } to signal the heart should appear filled
    return NextResponse.json({ liked: true, likes });
  } catch (err) {
    // Log the error server-side for debugging
    console.error('[POST /api/last-words/[id]/like]', err);
    // Return a generic 500 — don't expose stack traces
    return NextResponse.json({ error: 'Failed to toggle like.' }, { status: 500 });
  }
}
