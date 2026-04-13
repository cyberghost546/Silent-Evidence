// ============================================================
//  app/api/messages/unread-count/route.ts
//
//  GET /api/messages/unread-count
//
//  Returns the total number of unread direct messages for the
//  currently logged-in user.  This number is displayed as a
//  red badge on the message icon in the site header (e.g. "3").
//
//  If the user is not logged in, it returns { count: 0 } rather
//  than an error, so the header component can always render
//  safely without an auth check in the client.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── GET handler ───────────────────────────────────────────────────────────────
// Returns the total count of unread messages for the logged-in user.
export async function GET() {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the userId cookie value.
  // ?? 0 falls back to "0" if the cookie is absent.
  // Number() converts the string value to a number.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If no valid userId cookie exists the user is a guest.
  // Return { count: 0 } instead of 401 so the badge shows "0" rather than an error.
  if (!userId) return NextResponse.json({ count: 0 });

  // Count all DirectMessage rows where:
  //   1. The message was sent TO this user (receiverId = userId)
  //   2. The message has not been read yet (read = false)
  // COUNT is far more efficient than fetching all rows and calling .length in JS.
  const count = await prisma.directMessage.count({
    where: {
      // Only messages addressed to this user
      receiverId: userId,
      // Only those the user hasn't opened yet
      read: false,
    },
  });

  // Return the count as a simple JSON object
  return NextResponse.json({ count });
}
