/**
 * app/api/admin/comments/[id]/route.ts
 * ──────────────────────────────────────
 * PURPOSE:
 *   Admin-only API for managing a single comment by its numeric ID.
 *   Supports two operations:
 *     PATCH  — toggle the `flagged` field (mark a comment as flagged for review,
 *              or unflag it if it was previously flagged)
 *     DELETE — permanently remove the comment from the database
 *
 * WHAT IS "FLAGGED"?
 *   When a comment is flagged, it may be hidden from the public view or
 *   highlighted in the admin moderation queue for review.  This is separate
 *   from deletion — flagging is reversible, deletion is not.
 *
 * AUTH:
 *   Both handlers use the shared `isAdmin()` helper (defined at the top of
 *   this file) which reads the userId cookie and checks the database role.
 *   Non-admins receive 403 Forbidden.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - Extracting `isAdmin()` as a module-level async function (rather than
 *     repeating the cookie/DB check in every handler) is a clean pattern.
 *     For even larger projects, move it to a shared `lib/auth.ts` file.
 *   - `Boolean(flagged)` coerces the incoming value to a true boolean —
 *     safe even if the client sends the string "true" instead of the boolean true.
 *   - Returning `{ ok: true }` for write operations (instead of the updated
 *     record) is fine when the client already knows what changed and doesn't
 *     need the full record back.
 */

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to interact with the database
import { prisma } from '@/lib/prisma';

// Shared type alias for the route params shape.
// Next.js dynamic routes (like [id]) provide params as a Promise of an object.
// "{ id: string }" means the URL segment named "id" will always be a string.
// Using a type alias avoids repeating this long type in both handlers below.
type Params = { params: Promise<{ id: string }> };

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and checks whether the user has the ADMIN role.
// Returns true for admins, false for everyone else (including unauthenticated users).
// Defining this once at the top keeps both handlers below concise and DRY.
async function isAdmin() {
  // Read all cookies attached to the incoming request
  const cookieStore = await cookies();

  // Extract the userId cookie value and convert it to a number.
  // cookieStore.get('userId') returns { name, value } or undefined if absent.
  // ?.value uses optional chaining: evaluates to undefined if .get() returned undefined.
  // ?? 0 replaces undefined with 0 (our "no user" sentinel value).
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // A userId of 0 means no cookie was present — the user is not logged in
  if (!userId) return false;

  // Query the database for just the role column — avoids loading unnecessary data
  // findUnique() returns the matching row or null if no row has that id
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // user?.role === 'ADMIN' evaluates to false if user is null (safe with optional chaining)
  return user?.role === 'ADMIN';
}

// ── PATCH /api/admin/comments/[id] — toggle flagged status ───────────────────

// Sets or clears the `flagged` boolean on a specific comment.
// The admin moderation UI sends { flagged: true } to flag a comment,
// or { flagged: false } to unflag it after review.
//
// "req: Request" — the incoming HTTP request; we read its JSON body for the `flagged` value
// "{ params }: Params" — the dynamic [id] URL segment provided by Next.js
export async function PATCH(req: Request, { params }: Params) {
  // Block non-admins — return 403 Forbidden without touching the database
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Await the params Promise to extract the comment id string from the URL
  const { id } = await params;

  // Parse the JSON body to get the flagged value
  // Destructure directly: { flagged } pulls the flagged property out of the body object
  const { flagged } = await req.json();

  // Update only the flagged column on the comment row with the given id.
  // Number(id) converts the string "42" to the integer 42 for the DB query.
  // Boolean(flagged) safely coerces any value to true/false —
  //   protects against the client accidentally sending the string "true" instead of the boolean
  await prisma.comment.update({ where: { id: Number(id) }, data: { flagged: Boolean(flagged) } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/admin/comments/[id] — remove a comment ───────────────────────

// Permanently deletes the comment row with the given ID.
// This action cannot be undone — the admin UI should show a confirm dialog first.
// "_req" is prefixed with underscore to signal we intentionally ignore the request body.
// "{ params }: Params" — the dynamic [id] URL segment provided by Next.js
export async function DELETE(_req: Request, { params }: Params) {
  // Block non-admins — return 403 Forbidden without touching the database
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Await the params Promise to extract the comment id string from the URL
  const { id } = await params;

  // Delete the comment row — Prisma's delete() throws if no row matches,
  // so the comment must exist for this to succeed
  await prisma.comment.delete({ where: { id: Number(id) } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
