// app/api/admin/users/[id]/route.ts
// Admin-only API for managing a single user account, identified by their numeric ID
// in the URL path (e.g. /api/admin/users/5).
//
// PATCH  /api/admin/users/[id] — change the user's role.
//                                Body: { role: "GUEST" | "USER" | "AUTHOR" | "ADMIN" }
//                                Validates the role before writing to prevent invalid values.
// DELETE /api/admin/users/[id] — permanently delete the user account from the database.
//                                This is irreversible and also cascades to all related data
//                                (stories, comments, likes, etc.) depending on Prisma schema rules.
//
// AUTH:
//   Both handlers verify the requesting user is an ADMIN using the isAdmin() helper below.
//   Non-admins receive 403 Forbidden.

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
// Returns true for admins, false for everyone else (including unauthenticated users).
// Defining this once at the top keeps both handlers below clean and avoids duplicated code.
// "async" is required because we use "await" for cookies() and the Prisma query.
async function isAdmin() {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value and convert it to a number; default to 0 if absent.
  // ?.value uses optional chaining: returns undefined if the cookie doesn't exist.
  // ?? 0 replaces undefined/null with 0 — our "no user" sentinel value.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0, no cookie was present — the user is not logged in
  if (!userId) return false;

  // Look up the user in the database; only fetch the role column for efficiency
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user record exists and their role is exactly 'ADMIN'
  return user?.role === 'ADMIN';
}

// ── PATCH /api/admin/users/[id] — change a user's role ───────────────────────

// Updates the role of a specific user.
// Valid roles: GUEST, USER, AUTHOR, ADMIN.
// Invalid role values are rejected with 400 Bad Request.
//
// "req: Request" — the incoming HTTP request; we read its JSON body for { role }
// "{ params }: Params" — the dynamic [id] URL segment provided by Next.js
export async function PATCH(req: Request, { params }: Params) {
  // Block non-admins — return 403 Forbidden without touching the database
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Await the params Promise to get the user id string from the URL segment
  const { id } = await params;

  // Parse the JSON body to get the new role value.
  // Destructure directly: { role } pulls the role property from the body object.
  const { role } = await req.json();

  // ── Validate the role ─────────────────────────────────────────────────────────

  // Define the four valid roles that match the Role enum in the Prisma schema.
  // Using an array constant makes it easy to update if roles change in the future.
  const VALID_ROLES = ['GUEST', 'USER', 'AUTHOR', 'ADMIN'];

  // .includes() returns false if role is not in the array.
  // This prevents rogue values (e.g. "SUPERUSER") from being written to the database.
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  // ── Update the user's role in the database ────────────────────────────────────

  // prisma.user.update() runs a SQL UPDATE on the User table.
  // where: { id: Number(id) } targets the specific user row.
  //   Number(id) converts the URL string "5" to the integer 5 for the DB query.
  // data: { role } sets only the role column — all other user fields are untouched.
  await prisma.user.update({ where: { id: Number(id) }, data: { role } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/admin/users/[id] — delete a user account ─────────────────────

// Permanently removes the user row from the database.
// Depending on the Prisma schema's referential actions, this may also cascade-delete
// all content owned by the user (stories, comments, likes, follows, etc.).
// THIS ACTION IS IRREVERSIBLE — the admin UI should show a confirmation dialog first.
//
// "_req" is prefixed with underscore to signal we intentionally ignore the request body.
// "{ params }: Params" — the dynamic [id] URL segment provided by Next.js.
export async function DELETE(_req: Request, { params }: Params) {
  // Block non-admins — return 403 Forbidden without touching the database
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Await the params Promise to get the user id string from the URL segment
  const { id } = await params;

  // Delete the user row by their primary key.
  // Number(id) converts the URL string "5" to the integer 5.
  // prisma.user.delete() throws a Prisma error if no row matches — the user must exist.
  await prisma.user.delete({ where: { id: Number(id) } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
