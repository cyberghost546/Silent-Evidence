// app/api/comments/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles DELETE /api/comments/[id] — permanently removing a single
// comment identified by its database ID.
//
// Rules enforced by this endpoint:
//   1. The user must be logged in (session cookie must be present).
//   2. The comment must actually exist in the database.
//   3. Only the user who wrote the comment can delete it — users cannot delete
//      each other's comments (this is enforced via an ownership check, not admin status).
//
// The [id] in the file path is a Next.js dynamic route segment — it captures
// the comment's database ID from the URL (e.g. DELETE /api/comments/42 → id = "42").
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to look up and delete comment records
import { prisma } from '@/lib/prisma';

// Next.js passes dynamic route segments (the [id] part) through the params object.
// We declare it as a Promise because Next.js 15 made params async.
type Params = { params: Promise<{ id: string }> };

// ── DELETE handler ────────────────────────────────────────────────────────────
// This function runs whenever a DELETE request is made to /api/comments/[id].
// "_req" is the incoming request — prefixed with _ because we don't need to read its body.
// "params" — contains the dynamic [id] segment from the URL.
export async function DELETE(_req: Request, { params }: Params) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Identify the logged-in user from the session cookie
  const cookieStore = await cookies();

  // Extract the userId from the 'userId' cookie; default to 0 if the cookie is missing.
  // Number() converts the string cookie value to an integer.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0 (falsy), the user is not logged in — reject with 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // ── Extract the comment ID from the URL ───────────────────────────────────
  // Await the params to get the comment ID from the URL
  const { id } = await params;

  // ── Load the comment ──────────────────────────────────────────────────────
  // Fetch the comment first so we can check ownership before deleting.
  // We need to read it before deleting because we need the userId stored on it.
  // Fetch the comment first so we can check ownership before deleting
  const comment = await prisma.comment.findUnique({
    where: { id: Number(id) }, // Number() converts the URL string to an integer
  });

  // If the comment doesn't exist (wrong ID or already deleted), return 404
  // If the comment doesn't exist, return 404
  if (!comment) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // ── Ownership check ───────────────────────────────────────────────────────
  // Compare the comment's stored userId with the logged-in user's ID.
  // If they don't match, this user didn't write the comment — reject with 403 Forbidden.
  // If the comment belongs to someone else, return 403 Forbidden
  // This prevents users from deleting each other's comments
  if (comment.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // ── Delete the comment ────────────────────────────────────────────────────
  // Ownership confirmed — delete the comment from the database permanently.
  // We use the numeric id (Number(id)) for the where clause again to be explicit.
  // Ownership confirmed — delete the comment
  await prisma.comment.delete({ where: { id: Number(id) } });

  // Return 200 OK — the comment was successfully deleted
  return NextResponse.json({ ok: true });
}
