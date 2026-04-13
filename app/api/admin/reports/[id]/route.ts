// app/api/admin/reports/[id]/route.ts
// This file handles admin actions on a SINGLE report, identified by its numeric ID
// in the URL path (e.g. /api/admin/reports/17).
//
// PATCH /api/admin/reports/[id] — admin only: update the status of a report.
//
// WHAT IS A REPORT STATUS?
//   When a report is first created by a user, its status is PENDING.
//   After an admin reviews it, they set it to one of:
//     REVIEWED  — the admin looked at the content and took action (e.g. removed it)
//     DISMISSED — the admin looked at it and decided no action is needed
//   This endpoint validates that the new status is one of those two values,
//   then saves it to the database.
//
// AUTH:
//   Only admins can update reports.  The handler reads the userId cookie,
//   looks up the user's role in the database, and returns 401 or 403 if
//   the caller is not an authenticated admin.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';

// ── PATCH /api/admin/reports/[id] ────────────────────────────────────────────

// Updates the status of a single report.
//
// "req: Request" — the incoming HTTP request; we read its JSON body for the new status.
// "{ params }: { params: Promise<{ id: string }> }" — Next.js passes the dynamic [id]
//   URL segment as a string inside a Promise-wrapped params object.
//   Even though our DB uses integer IDs, the URL always provides it as a string.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth check ────────────────────────────────────────────────────────────────

  // Read all cookies attached to the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value and convert it to a number.
  // ?.value uses optional chaining: returns undefined if the cookie doesn't exist.
  // ?? 0 replaces undefined/null with 0 — our "no user" sentinel.
  // || null converts 0 to null so the falsy check below works cleanly.
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // If userId is null, the user is not logged in — return 401 Unauthorized.
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Look up the user in the database to verify their role.
  // Only fetch the role column — we don't need any other user data here.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // If the user doesn't exist or isn't an ADMIN, return 403 Forbidden.
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse URL params and request body ────────────────────────────────────────

  // Await the params Promise to get the id string from the URL segment.
  // Even though we declared params as a Promise, Next.js populates it synchronously —
  // we still need to await it because the type system requires it.
  const { id } = await params;

  // Parse the JSON body of the request.
  // We expect { status: "REVIEWED" } or { status: "DISMISSED" }.
  // Destructure directly to get the status field.
  const { status } = await req.json();

  // ── Validate the new status ────────────────────────────────────────────────────

  // Define the two valid status transitions an admin can make.
  // Using an array constant makes it easy to add new statuses later without changing the logic.
  const allowedStatuses = ['REVIEWED', 'DISMISSED'];

  // .includes() checks whether the provided status is in our allowed list.
  // If it's not (e.g. someone sends { status: "DELETED" }), return 400 Bad Request.
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // ── Update the report in the database ────────────────────────────────────────

  // prisma.report.update() runs a SQL UPDATE on the Report table.
  // where: { id: Number(id) } targets the specific report row.
  //   Number(id) converts the URL string "17" to the integer 17 for the DB query.
  // data: { status } sets only the status column — all other columns are untouched.
  //   { status } is shorthand for { status: status } when the key and variable name match.
  const updated = await prisma.report.update({
    where: { id: Number(id) },
    data: { status },
  });

  // Return the updated report object as JSON.
  // The admin UI uses the returned object to update its local state without re-fetching.
  return NextResponse.json(updated);
}
