// app/api/admin/creepy-of-month/route.ts
// This file manages the "Creepy of the Month" featured story highlight.
//
// PATCH /api/admin/creepy-of-month — admin only: sets a story as the featured pick,
//                                    or clears the featured pick if no storyId is sent.
//
// HOW IT WORKS:
//   The `creepyOfMonth` flag is a boolean column on the Story table.
//   Only one story should have this flag set to true at a time.
//   The PATCH handler enforces this by:
//     1. Clearing the flag on ALL stories first (updateMany)
//     2. Then setting it on the specified story (update)
//   This "clear all then set one" approach is a simple and reliable way to
//   manage a "one active record" constraint without needing a separate table.
//
// CLEARING vs. SETTING:
//   - Send { storyId: 123 } to feature story #123.
//   - Send { storyId: null } (or omit storyId) to clear the feature entirely.
//     The `if (storyId)` guard skips the second update in this case.

// Import NextRequest (request with typed query params) and NextResponse for building responses
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and returns true only if the user has the ADMIN role.
// The `|| null` converts 0 (the default when the cookie is missing) to null, which
// is falsy — makes the `if (!userId)` check cleaner than comparing `=== 0`.
async function isAdmin() {
  // Read all cookies from the incoming request
  const c = await cookies();

  // Get the userId cookie value; default to 0 then convert 0 to null with || null
  // Number() converts the string to a number; || null makes 0 into null (both are falsy)
  const userId = Number(c.get('userId')?.value ?? 0) || null;

  // If userId is null (no cookie or value was 0), the user is not logged in
  if (!userId) return false;

  // Look up the user in the database to get their role
  // findUnique returns null if no row matches; optional chaining ?. handles that safely
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user record exists and has the ADMIN role
  return user?.role === 'ADMIN';
}

// ── PATCH /api/admin/creepy-of-month ─────────────────────────────────────────

// Sets the specified story as "Creepy of the Month".
// Always clears any existing pick first so only one story ever holds the flag.
// If storyId is null, falsy, or omitted, the handler just clears without setting a new pick.
//
// "req: NextRequest" — the incoming HTTP request; we read its JSON body for the storyId
export async function PATCH(req: NextRequest) {
  // Block non-admins — return 403 Forbidden without touching the database
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Parse the JSON body to get the storyId
  // storyId may be a number (to set a pick) or null/undefined (to just clear)
  const { storyId } = await req.json();

  // ── Step 1: Clear all existing picks ────────────────────────────────────────

  // updateMany runs a single SQL UPDATE against ALL stories where creepyOfMonth is true.
  // This efficiently clears any previous pick regardless of how many were set.
  // where: { creepyOfMonth: true } filters to only stories that need clearing (usually just one).
  // data: { creepyOfMonth: false } sets the flag to false on all matched rows.
  await prisma.story.updateMany({ where: { creepyOfMonth: true }, data: { creepyOfMonth: false } });

  // ── Step 2: Set the new pick (if a storyId was provided) ─────────────────────

  // Only run this if storyId is truthy (a non-zero number).
  // If storyId is null, undefined, or 0, we skip this — the result is just a cleared pick.
  if (storyId) {
    // update() targets the specific story row by its primary key ID
    // and sets its creepyOfMonth flag to true
    await prisma.story.update({ where: { id: storyId }, data: { creepyOfMonth: true } });
  }

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
