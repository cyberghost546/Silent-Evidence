// ============================================================
//  app/api/push/unsubscribe/route.ts
//
//  DELETE /api/push/unsubscribe
//
//  Removes a Web Push subscription endpoint from the database
//  so the server no longer sends push notifications to that browser.
//
//  Called when:
//    - The user turns off notifications in the settings UI
//    - The browser revokes notification permission
//    - The PushNotificationToggle is switched off
//
//  Security: we filter by both `endpoint` AND `userId` so a user
//  can only unsubscribe their own devices, not someone else's.
//
//  Expected JSON body: { endpoint: string }
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── DELETE handler ────────────────────────────────────────────────────────────
// Deletes the push subscription row matching the given endpoint.
// Expected JSON body: { endpoint: string }
export async function DELETE(req: Request) {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID from the session cookie
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to unsubscribe
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse the JSON body to get the subscription endpoint to remove
  const { endpoint } = await req.json();

  // endpoint is required — without it we don't know which subscription to delete
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });

  // Delete all push subscription rows matching BOTH the endpoint AND the userId.
  // deleteMany (rather than delete) is used because there's no single unique
  // primary key being targeted here — we match on two fields.
  // The userId check is an extra security measure so a user can only remove
  // their own subscriptions even if they somehow know another user's endpoint URL.
  await prisma.pushSubscription.deleteMany({
    where: {
      // The specific browser channel to stop sending notifications to
      endpoint,
      // Safety check — only delete subscriptions that belong to the caller
      userId,
    },
  });

  // Return a simple success response
  return NextResponse.json({ ok: true });
}
