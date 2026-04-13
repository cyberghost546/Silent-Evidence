// ============================================================
//  app/api/notifications/route.ts
//
//  Manages in-app notifications for the logged-in user.
//  Notifications are created by other parts of the system when
//  events occur (new follower, new like, new comment, etc.) and
//  displayed in the notification bell dropdown in the header.
//
//  GET  /api/notifications
//    → Returns the 20 most recent notifications for the logged-in
//      user, plus an `unread` count for the red bell badge.
//      Guests receive { notifications: [], unread: 0 } so the
//      component never crashes when not logged in.
//
//  PATCH /api/notifications
//    → Marks ALL unread notifications as read.
//      Called automatically when the user opens the notification panel.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB queries
import { prisma } from '@/lib/prisma';

// ── GET /api/notifications ─────────────────────────────────────────────────────
// Returns recent notifications and the unread count for the bell badge.
export async function GET() {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the userId cookie and convert it to a number.
  // 0 means the cookie was missing — treated as "not logged in" below.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Guests don't have notifications — return empty data rather than an error
  // so the NotificationBell component can still render without crashing
  if (!userId) return NextResponse.json({ notifications: [], unread: 0 });

  // Fetch the 20 most recent notifications for this user.
  // 20 is enough to fill the dropdown panel without over-fetching.
  const notifications = await prisma.notification.findMany({
    where: {
      // Only this user's notifications
      userId,
    },
    // Newest notifications first — most relevant at the top of the list
    orderBy: { createdAt: 'desc' },
    // Cap at 20 rows
    take: 20,
    // Include the related story's slug and title so the notification link works.
    // Not all notification types have a story (e.g. FOLLOW), so this can be null.
    include: { story: { select: { slug: true, title: true } } },
  });

  // Count how many of the fetched notifications haven't been read yet.
  // This drives the red badge number on the bell icon.
  // We count in JavaScript from the already-fetched array to avoid an extra DB query.
  const unread = notifications.filter(n => !n.read).length;

  // Return both the notification list and the unread count together
  return NextResponse.json({ notifications, unread });
}

// ── PATCH /api/notifications ───────────────────────────────────────────────────
// Marks all of the logged-in user's unread notifications as read.
// Called when the user opens the notification panel so the badge resets to zero.
export async function PATCH() {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the userId — must be logged in to mark notifications as read
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Guests cannot mark notifications as read
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Update every unread notification for this user in a single database operation.
  // updateMany is more efficient than looping and updating each row individually —
  // it translates to one SQL UPDATE WHERE statement instead of many.
  await prisma.notification.updateMany({
    where: {
      // Only this user's notifications
      userId,
      // Only those that are still unread
      read: false,
    },
    // Flip the read flag to true for all matching rows
    data: { read: true },
  });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
