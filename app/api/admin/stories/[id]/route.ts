// app/api/admin/stories/[id]/route.ts
// Admin-only API for managing individual stories, identified by their numeric ID
// in the URL path (e.g. /api/admin/stories/99).
//
// PATCH  /api/admin/stories/[id] — update a story's status (DRAFT / PUBLISHED / ARCHIVED)
//                                   or toggle its "featured" flag.
//                                   Only the fields present in the request body are changed.
// DELETE /api/admin/stories/[id] — permanently delete a story from the database.
//                                   This action is irreversible.
//
// AUTH:
//   Both endpoints verify the calling user is an ADMIN by reading the userId cookie
//   and checking the database.  Non-admins receive 403 Forbidden.
//
// WHY CHECK THE DB AND NOT JUST THE COOKIE?
//   Cookies can be forged.  By verifying the user's role server-side in the database,
//   we ensure that even if someone edits their cookie they can't impersonate an admin.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';

// Shared type alias for the dynamic route params shape.
// Next.js wraps URL segments in a Promise — we await them before use.
// "{ id: string }" means the URL contains a segment named "id" that is always a string.
type Params = { params: Promise<{ id: string }> };

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and checks whether that user has the ADMIN role in the database.
// Returns true if they are an admin, false if they are not (or if not logged in).
// Defining this once at module level keeps both handlers below clean and DRY (Don't Repeat Yourself).
// "async" is required because we must "await" cookies() and the Prisma query.
async function isAdmin() {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value and convert it to a number.
  // ?.value uses optional chaining: returns undefined if the cookie is absent.
  // ?? 0 replaces undefined/null with 0 — our "no user" sentinel value.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0, no cookie was present — the user is not logged in
  if (!userId) return false;

  // Look up the user in the database; only fetch the role column to avoid loading extra data.
  // findUnique() returns the row or null if no row has that id.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user record exists and their role is exactly 'ADMIN'.
  // user?.role uses optional chaining: evaluates to undefined if user is null, which !== 'ADMIN'.
  return user?.role === 'ADMIN';
}

// ── PATCH /api/admin/stories/[id] ────────────────────────────────────────────

// Partially updates a story.  Supports two optional fields:
//   status   — one of 'DRAFT', 'PUBLISHED', or 'ARCHIVED'
//   featured — a boolean flag that highlights the story in the UI
// Only fields present in the request body are changed — omitted fields keep their values.
//
// "req: Request" — the incoming HTTP request; we read its JSON body for fields to update.
// "{ params }: Params" — the dynamic [id] URL segment provided by Next.js.
export async function PATCH(req: Request, { params }: Params) {
  // Block non-admins — return 403 Forbidden without touching the database
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Await the params Promise to get the story id string from the URL segment
  const { id } = await params;

  // Parse the JSON body into a plain object so we can read fields from it
  const body = await req.json();

  // Build the Prisma update payload — start empty and only add fields that were sent.
  // Record<string, unknown> means "an object with string keys and values of any type".
  // Using an empty object rather than spreading body prevents unknown fields from sneaking in.
  const data: Record<string, unknown> = {};

  // ── Validate and add 'status' if provided ────────────────────────────────────

  // Define the three valid story statuses that match the Prisma schema enum.
  // Using an array constant means we only have to update this list in one place.
  const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

  // Only process status if the client actually sent it (body.status !== undefined).
  if (body.status !== undefined) {
    // Reject any status value that isn't one of the three valid options.
    // .includes() returns false if the value isn't in the array.
    // This prevents rogue values (e.g. "DELETED") from being written to the DB.
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
    // The status is valid — add it to the update payload
    data.status = body.status;
  }

  // ── Add 'featured' if provided ───────────────────────────────────────────────

  // Only process featured if the client actually sent it (body.featured !== undefined).
  if (body.featured !== undefined) {
    // Boolean() coerces the value to a true boolean — protects against "true" (string) from the client.
    data.featured = Boolean(body.featured);
  }

  // ── Write to database ─────────────────────────────────────────────────────────

  // prisma.story.update() runs a SQL UPDATE using only the fields in `data`.
  // where: { id: Number(id) } targets the specific story row.
  //   Number(id) converts the URL string "99" to the integer 99 for the DB query.
  // All other story columns (title, content, slug, etc.) are left untouched.
  await prisma.story.update({ where: { id: Number(id) }, data });

  // Return a simple success acknowledgement — { ok: true } is a common REST convention
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/admin/stories/[id] ───────────────────────────────────────────

// Permanently removes the story row with the given ID from the database.
// This also cascades to related rows (likes, comments, bookmarks, etc.) depending
// on the referential actions configured in the Prisma schema.
// THIS ACTION IS IRREVERSIBLE — the admin UI should show a confirmation dialog first.
//
// "_req" is prefixed with underscore to signal we intentionally ignore the request body.
// "{ params }: Params" — the dynamic [id] URL segment provided by Next.js.
export async function DELETE(_req: Request, { params }: Params) {
  // Block non-admins — return 403 Forbidden without touching the database
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Await the params Promise to get the story id string from the URL segment
  const { id } = await params;

  // Delete the story row by its primary key.
  // Number(id) converts the URL string "99" to the integer 99.
  // prisma.story.delete() throws if no row matches — the story must exist.
  await prisma.story.delete({ where: { id: Number(id) } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
