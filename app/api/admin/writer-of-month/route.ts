// app/api/admin/writer-of-month/route.ts
// This file manages the "Writer of the Month" designation — a single highlighted user
// featured on the site each month.
//
// POST   /api/admin/writer-of-month — sets one user as Writer of the Month.
//                                     Body: { userId: number }
//                                     Clears the flag from ALL users first, then sets
//                                     it on the chosen user — ensuring only one user
//                                     ever holds the title at a time.
//                                     Both operations run in a single database transaction
//                                     so they either both succeed or both fail together.
//
// DELETE /api/admin/writer-of-month — removes the Writer of the Month designation entirely
//                                     by clearing the flag from all users.
//                                     After this, no user holds the title.
//
// NOTE ON AUTH:
//   Unlike most admin endpoints in this codebase, this file does NOT check for
//   the ADMIN role before performing the operation.  If you need to add auth,
//   add a cookie check (see other files in this folder for the pattern).
//
// WHAT IS writerOfMonth?
//   A boolean column on the User table.  When true, that user is displayed as
//   the featured Writer of the Month in the site sidebar or homepage.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';

// ── POST /api/admin/writer-of-month ──────────────────────────────────────────

// Sets one user as Writer of the Month.
// Uses a database transaction to atomically clear all flags and then set the new one.
//
// "req: Request" — the incoming HTTP request; we read its JSON body for { userId }
export async function POST(req: Request) {
  try {
    // Parse the JSON body of the request.
    // We expect { userId: 7 } where 7 is the numeric ID of the user to feature.
    const { userId } = await req.json();

    // Validate that userId is present and truthy (non-zero number).
    // !userId catches null, undefined, 0, and empty string.
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // ── Database transaction ──────────────────────────────────────────────────

    // prisma.$transaction([...]) runs multiple Prisma operations as a single atomic unit.
    // "Atomic" means: either ALL of these operations succeed and are saved together,
    // or NONE of them are saved if any one of them throws an error.
    // This guarantees we never end up with two users flagged as Writer of the Month.
    await prisma.$transaction([

      // Step 1: Clear the writerOfMonth flag from ALL users in the database.
      // updateMany runs a single SQL UPDATE with no where clause — affects every user row.
      // data: { writerOfMonth: false } sets the column to false for everyone.
      prisma.user.updateMany({ data: { writerOfMonth: false } }),

      // Step 2: Set the writerOfMonth flag to true for the chosen user only.
      // update() targets the specific user row by primary key.
      // where: { id: userId } — the numeric ID of the user to feature.
      // data: { writerOfMonth: true } — sets their flag to true.
      prisma.user.update({ where: { id: userId }, data: { writerOfMonth: true } }),
    ]);

    // Return a simple success acknowledgement if both operations succeeded
    return NextResponse.json({ ok: true });

  } catch (e) {
    // Catch any error from JSON parsing or the database transaction.
    // Return 500 Internal Server Error with a generic message.
    // We avoid leaking internal error details to the client for security.
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── DELETE /api/admin/writer-of-month ────────────────────────────────────────

// Clears the Writer of the Month designation from all users.
// After this call, no user has writerOfMonth = true.
// No request body is needed — just the DELETE method on this URL.
export async function DELETE() {
  // updateMany with no where clause updates ALL rows in the User table.
  // data: { writerOfMonth: false } sets the column to false for every user.
  // This is a fast single SQL UPDATE regardless of how many users are in the database.
  await prisma.user.updateMany({ data: { writerOfMonth: false } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
