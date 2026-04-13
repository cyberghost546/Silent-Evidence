// app/api/admin/users/[id]/verify/route.ts
// Admin-only endpoint to toggle the "verified" badge on a user account.
//
// PATCH /api/admin/users/[id]/verify — flips the isVerified boolean for the given user.
//   If the user is currently verified (isVerified = true), this sets it to false.
//   If the user is currently not verified (isVerified = false), this sets it to true.
//
// WHAT IS "VERIFIED"?
//   A verified badge indicates the user is a confirmed, trusted member of the community
//   (e.g. a known author, notable contributor, or identity-confirmed account).
//   The badge is displayed on their profile and next to their comments/stories.
//   Admins grant or revoke this badge manually.
//
// AUTH:
//   Only admins can call this endpoint.  The handler reads the userId cookie from
//   the request, looks up the admin's role in the database, and returns 401/403
//   if the caller is not an authenticated admin.
//   Note: the "admin" user and the "target" user are different people — the admin
//   is the person making the request; the target is the user being verified.

// Import NextRequest (with typed URL helpers) and NextResponse for building responses
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';

// Shared type alias for the dynamic route params shape.
// Next.js wraps URL segments in a Promise — we await them before use.
// "{ id: string }" means the [id] URL segment is always provided as a string.
type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/admin/users/[id]/verify ───────────────────────────────────────

// Reads the target user's current isVerified value, then flips it.
// Returns { id, isVerified } of the updated user so the UI can update in place.
//
// "req: NextRequest" — the incoming HTTP request (body is unused; the action is implicit from the method)
// "{ params }: Params" — the dynamic [id] URL segment provided by Next.js
export async function PATCH(req: NextRequest, { params }: Params) {
  // ── Auth check: verify the CALLER is an admin ─────────────────────────────────

  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value and convert it to a number.
  // This is the ID of the admin making the request — NOT the user being verified.
  // ?.value uses optional chaining: returns undefined if the cookie doesn't exist.
  // ?? 0 replaces undefined/null with 0 — our "no user" sentinel value.
  const adminId = Number(cookieStore.get('userId')?.value ?? 0);

  // If adminId is 0, no cookie was present — the caller is not logged in.
  // Return 401 Unauthorized: "you must be logged in."
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Look up the admin's role in the database.
  // where: { id: adminId } targets the row for the person making this request.
  // select: { role: true } fetches only the role column — efficient.
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });

  // If the admin record doesn't exist or their role isn't ADMIN, return 403 Forbidden.
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse and validate the target user ID from the URL ────────────────────────

  // Await the params Promise to get the id string from the URL segment.
  // "id" here refers to the TARGET user whose verification status we want to toggle.
  const { id } = await params;

  // Convert the URL string "5" to the integer 5 for database queries.
  const userId = Number(id);

  // If the ID is 0 or NaN (e.g. the URL had a non-numeric segment), return 400 Bad Request.
  if (!userId) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });

  // ── Read the target user's current isVerified value ──────────────────────────

  // Look up the target user to find their current isVerified value.
  // We need the current value so we can flip it (toggle it to its opposite).
  // select: { isVerified: true } fetches only the isVerified column — no extra data.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } });

  // If no user exists with that ID, return 404 Not Found.
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // ── Toggle and save the new isVerified value ──────────────────────────────────

  // prisma.user.update() runs a SQL UPDATE on the User table.
  // where: { id: userId } targets the specific user row.
  // data: { isVerified: !user.isVerified } flips the boolean:
  //   if isVerified was true  → set it to false (revoke verification)
  //   if isVerified was false → set it to true  (grant verification)
  // select: { id: true, isVerified: true } returns only these two fields in the response —
  //   enough for the admin UI to update the displayed badge without re-fetching the full user.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isVerified: !user.isVerified },
    select: { id: true, isVerified: true },
  });

  // Return the updated user with their new isVerified state.
  // The admin UI uses this to immediately show or hide the verified badge.
  return NextResponse.json(updated);
}
