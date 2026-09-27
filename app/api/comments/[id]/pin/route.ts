// app/api/comments/[id]/pin/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles PATCH /api/comments/[id]/pin — toggling the "pinned" flag
// on a comment.
//
// Rules enforced by this endpoint:
//   1. The user must be logged in.
//   2. Only the author of the STORY that the comment belongs to can pin or unpin
//      comments — regular users cannot pin comments on someone else's story.
//   3. Only ONE comment can be pinned at a time per story. If the caller is
//      pinning a new comment, any previously pinned comment is unpinned first.
//   4. If the target comment is already pinned, this endpoint unpins it (toggle).
//
// Example use-case: the story author pins a comment that provides helpful
// context or a favourite reader reaction below their story.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to query and update comment records
import { prisma } from '@/lib/prisma';

// Next.js App Router passes dynamic route segments (e.g. [id]) through a params Promise.
// We declare the type so TypeScript knows what the resolved params object looks like.
type Params = { params: Promise<{ id: string }> };

// ── PATCH handler ─────────────────────────────────────────────────────────────
// This function runs whenever a PATCH request is made to /api/comments/[id]/pin.
// "req"    — the incoming request (body is not used; the action is implied by the route)
// "params" — contains the dynamic [id] segment (the comment's database ID)
export async function PATCH(req: NextRequest, { params }: Params) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Read the session cookie to identify the requesting user
  const c = await cookies();

  // Extract the userId from the 'userId' cookie; default to 0 if the cookie is missing.
  // Number() converts the string cookie value to an integer.
  const userId = Number(c.get('userId')?.value ?? 0);

  // If userId is 0 (falsy), the user is not logged in — reject with 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Extract the comment ID from the URL ───────────────────────────────────
  // Await the params Promise to get the comment ID string
  const { id } = await params;

  // Convert the URL string to an integer for the database query
  const commentId = Number(id);

  // ── Load the comment and verify story ownership ───────────────────────────
  // Fetch the comment along with its parent story's authorId.
  // We need the authorId to check that only the story author can pin comments.
  // Fetch comment + story to verify ownership
  const comment = await prisma.comment.findUnique({
    where: { id: commentId }, // target this specific comment by its primary key

    select: {
      id: true, // the comment's own ID (used in the update below)
      pinned: true, // the current pinned state (used for toggle logic)
      storyId: true, // which story this comment belongs to
      story: { select: { authorId: true } }, // the story's author ID for the permission check
    },
  });

  // If the comment doesn't exist in the database, return 404 Not Found
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  // Only the story's author is allowed to pin or unpin comments.
  // If the logged-in user is not the story's author, reject with 403 Forbidden.
  if (comment.story.authorId !== userId) {
    return NextResponse.json({ error: 'Only the story author can pin comments' }, { status: 403 });
  }

  // ── Unpin any other pinned comments (if we're about to pin this one) ──────
  // Only one comment can be pinned per story at a time.
  // If this comment is NOT currently pinned (meaning we're about to pin it),
  // first clear any other pinned comment on the same story.
  // If this comment IS already pinned, we're toggling it off — no need to clear others.
  if (!comment.pinned) {
    // Unpin any previously pinned comment on this story first (only one at a time)
    await prisma.comment.updateMany({
      where: {
        storyId: comment.storyId, // only affect comments on this specific story
        pinned: true, // only target comments that are currently pinned
      },
      data: {
        pinned: false, // unpin them all (should only ever be one, but updateMany is safe)
      },
    });
  }

  // ── Toggle this comment's pinned state ────────────────────────────────────
  // If comment.pinned was true  → !comment.pinned = false → we're unpinning it
  // If comment.pinned was false → !comment.pinned = true  → we're pinning it
  // Toggle this comment's pinned state
  const updated = await prisma.comment.update({
    where: { id: commentId }, // target this specific comment
    data: { pinned: !comment.pinned }, // flip the boolean — toggle the pinned state

    select: {
      id: true, // return the comment's ID so the client can match the response
      pinned: true, // return the NEW pinned state so the UI can update the pin button
    },
  });

  // Return the updated comment with its new pinned state
  return NextResponse.json(updated);
}
