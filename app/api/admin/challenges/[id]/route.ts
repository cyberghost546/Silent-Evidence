/**
 * app/api/admin/challenges/[id]/route.ts
 * ───────────────────────────────────────
 * PURPOSE:
 *   Admin-only REST API for a single writing challenge, identified by its numeric ID.
 *   Handles three operations:
 *     PATCH  — edit any of the challenge's fields (title, dates, active flag, etc.)
 *     DELETE — permanently delete the challenge and all its entries
 *     POST   — reset (wipe) all entries so the challenge can run again fresh
 *
 * WHY POST FOR RESET INSTEAD OF DELETE?
 *   DELETE is reserved for deleting the challenge itself.  We use POST with a
 *   `{ action: 'reset' }` body to mean "delete the entries but keep the challenge".
 *   This is a common REST convention when you need multiple "write" operations
 *   on the same resource beyond just create/update/delete.
 *
 * AUTH PATTERN:
 *   Each handler repeats the same three-line auth check:
 *     1. Read userId from the cookie
 *     2. Look up the user in the DB
 *     3. Return 403 if not ADMIN
 *   In a larger project you'd extract this into a shared middleware or helper,
 *   but inlining it here keeps each handler self-contained and easy to follow.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - The `data: Record<string, any> = {}` + `if (field !== undefined) data.field = value`
 *     pattern is the standard way to build a partial Prisma update — only the
 *     fields present in the request body get updated.
 *   - `new Date(body.startDate)` converts an ISO string (sent by the client) back
 *     into a JavaScript Date object that Prisma can write to a DateTime column.
 *   - `.catch(() => ({}))` on `req.json()` is a safe way to handle malformed JSON
 *     bodies — it returns an empty object instead of throwing an error.
 */

// Import NextResponse to construct JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie from the incoming request
import { cookies } from 'next/headers';

// Import the Prisma client to interact with the database
import { prisma } from '@/lib/prisma';

// ── PATCH /api/admin/challenges/[id] — edit a challenge ──────────────────────

// Updates the challenge's editable fields.  Only fields present in the request
// body are changed; omitted fields keep their current database values.
//
// "req: Request" — the incoming HTTP request; we call req.json() to read its body
// "{ params }: { params: Promise<{ id: string }> }" — Next.js provides the dynamic
//   URL segment [id] as a string inside a Promise-wrapped params object
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // ── Auth check ────────────────────────────────────────────────────────────────

  // Read all cookies from the request
  const cookieStore = await cookies();

  // Get the userId cookie value and convert it to a number; default to 0 if absent
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0, the user is not logged in — return 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Fetch the user's role from the database to confirm they are an admin
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // If the user record doesn't exist or their role isn't ADMIN, return 403 Forbidden
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // ── Parse URL params and request body ────────────────────────────────────────

  // Await the params Promise to get the id string from the URL segment
  const { id } = await params;

  // Parse the JSON body of the request into a plain object
  const body = await req.json();

  // ── Build partial update payload ─────────────────────────────────────────────

  // Start with an empty object — we only add fields that were actually sent.
  // Record<string, any> means "an object whose keys are strings and values are anything".
  // This allows us to assign different value types (string, boolean, Date) to the same object.
  const data: Record<string, any> = {};

  // Only include each field if the client sent it (not undefined).
  // This is the standard pattern for PATCH: partial updates, not full replacements.
  if (body.title       !== undefined) data.title       = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.prompt      !== undefined) data.prompt      = body.prompt;

  // Date fields arrive from the client as ISO 8601 strings (e.g. "2025-01-15T00:00:00.000Z").
  // Prisma expects JavaScript Date objects for DateTime columns, so we convert them here.
  // new Date("2025-01-15T00:00:00.000Z") parses the string into a Date object.
  if (body.startDate   !== undefined) data.startDate   = new Date(body.startDate);
  if (body.endDate     !== undefined) data.endDate     = new Date(body.endDate);

  // active is a boolean — true means the challenge is currently accepting entries
  if (body.active      !== undefined) data.active      = body.active;

  // ── Write to database ─────────────────────────────────────────────────────────

  // Prisma's update() modifies only the columns in `data` — all other columns stay the same.
  // where: { id: Number(id) } targets the specific challenge row
  // Number(id) converts the URL string "7" to the integer 7 for the DB query
  const challenge = await prisma.challenge.update({
    where: { id: Number(id) },
    data,
  });

  // Return the updated challenge object so the admin UI can refresh its state
  return NextResponse.json(challenge);
}

// ── DELETE /api/admin/challenges/[id] — delete a challenge ───────────────────

// Permanently removes the challenge row.
// All associated ChallengeEntry rows are also deleted via Prisma's referential actions
// (or explicit cascading rules configured in the schema).
//
// "req: Request" — included to match Next.js handler signature; body is unused
// "{ params }: { params: Promise<{ id: string }> }" — dynamic URL segment [id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // ── Auth check ────────────────────────────────────────────────────────────────

  // Read all cookies from the request
  const cookieStore = await cookies();

  // Get the userId cookie and convert it to a number
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Not logged in — return 401
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Fetch the user's role from the database
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Not an admin — return 403
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // ── Delete the challenge ──────────────────────────────────────────────────────

  // Await the params Promise to extract the id string from the URL
  const { id } = await params;

  // Delete the challenge row — Number(id) converts the string to an integer
  await prisma.challenge.delete({ where: { id: Number(id) } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}

// ── POST /api/admin/challenges/[id] — reset entries ──────────────────────────

// Deletes all user submissions (ChallengeEntry rows) for this challenge so it can
// run again from a clean slate.  The challenge itself is NOT deleted.
// Requires { action: 'reset' } in the request body as a deliberate safety gate —
// you can't trigger this accidentally with an empty POST.
//
// "req: Request" — we read the body to check for the required action flag
// "{ params }: { params: Promise<{ id: string }> }" — dynamic URL segment [id]
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // ── Auth check ────────────────────────────────────────────────────────────────

  // Read all cookies from the request
  const cookieStore = await cookies();

  // Get the userId cookie and convert to a number
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Not logged in — return 401
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Fetch the user's role from the database
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Not an admin — return 403
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // ── Parse URL params and request body ────────────────────────────────────────

  // Await the params Promise to extract the challenge id string from the URL
  const { id } = await params;

  // Safely parse the JSON body.
  // .catch(() => ({})) handles the case where the body is missing or malformed JSON —
  // instead of throwing an unhandled error, it returns an empty object so we can
  // check body.action safely below.
  const body = await req.json().catch(() => ({}));

  // ── Safety check ──────────────────────────────────────────────────────────────

  // Require the explicit action flag to prevent accidental resets from empty POSTs.
  // If the body doesn't have { action: 'reset' }, return 400 Bad Request.
  if (body.action !== 'reset') return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  // ── Delete all entries for this challenge ──────────────────────────────────────

  // deleteMany removes every ChallengeEntry row where challengeId matches.
  // This is a single SQL DELETE statement — efficient even for large entry counts.
  // The challenge row itself is untouched; only submissions are wiped.
  await prisma.challengeEntry.deleteMany({ where: { challengeId: Number(id) } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
