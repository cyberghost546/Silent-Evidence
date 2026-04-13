// app/api/admin/reports/route.ts
// This file provides the admin-only endpoint for fetching all content reports.
//
// GET /api/admin/reports — returns every report in the database, sorted by newest first.
// Each report includes the username of the person who filed it (the "reporter").
//
// WHAT IS A REPORT?
//   A report is created when a user flags a story or comment as inappropriate,
//   offensive, or in violation of community guidelines.  Admins review these
//   reports and take action (e.g. remove content, warn a user).
//
// AUTH:
//   Only admins can view reports.  The handler reads the userId cookie,
//   looks up the user's role in the database, and returns 401 or 403 if
//   the caller is not an authenticated admin.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to query the database
import { prisma } from '@/lib/prisma';

// ── GET /api/admin/reports ────────────────────────────────────────────────────

// Returns all content reports, newest first, with reporter details included.
// "export async function GET()" registers this as Next.js's GET handler.
// No parameters are needed — there is no request body and no dynamic URL segment.
export async function GET() {
  // ── Auth check ────────────────────────────────────────────────────────────────

  // Read all cookies attached to the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value and convert it to a number.
  // cookieStore.get('userId') returns { name, value } or undefined if the cookie is absent.
  // ?.value uses optional chaining: evaluates to undefined if .get() returned undefined.
  // ?? 0 replaces undefined/null with 0 — our "no user" sentinel value.
  // || null converts 0 to null so we can use a clean falsy check below.
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // If userId is null, the cookie was missing or zero — the user is not logged in.
  // Return 401 Unauthorized: "you must be logged in to access this."
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Look up the user record in the database to verify their role.
  // where: { id: userId } targets the specific user row by primary key.
  // select: { role: true } fetches only the role column — avoids loading unnecessary data.
  // findUnique() returns the row object or null if no row has that id.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // If the user doesn't exist in the database, or their role is not ADMIN,
  // return 403 Forbidden: "you are logged in but you don't have permission."
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Fetch all reports ─────────────────────────────────────────────────────────

  // prisma.report.findMany() retrieves all Report rows from the database.
  // orderBy: { createdAt: 'desc' } sorts the results so the newest reports appear first.
  // include: { reporter: ... } performs a JOIN to attach the reporter's username to each report.
  //   reporter is a relation on the Report model pointing to the User who filed the report.
  //   select: { username: true } means we only fetch the username — not the full user record.
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { username: true } },
    },
  });

  // Return the array of report objects as JSON (default status 200 OK).
  // Each object includes all Report fields plus a nested reporter: { username } object.
  return NextResponse.json(reports);
}
