// ============================================================
//  app/api/push/subscribe/route.ts
//
//  POST /api/push/subscribe
//
//  Saves a Web Push subscription object for the logged-in user
//  so the server can send them browser push notifications later.
//
//  How Web Push works:
//    1. The browser generates a PushSubscription object when the
//       user grants notification permission.
//    2. That object contains:
//         endpoint — a unique URL at the push service (e.g. FCM)
//         keys.p256dh — public key for encrypting the notification payload
//         keys.auth  — authentication secret
//    3. We save all three values to the database.
//    4. When we want to push a notification, we call web-push's
//       sendNotification() with these values (see lib/webpush.ts).
//
//  Uses upsert so if the same endpoint re-subscribes (e.g. after
//  the browser rotates its keys), the existing row is updated
//  rather than creating a duplicate.
//
//  Called by: PushNotificationToggle component in the UI.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client for DB writes
import { prisma } from '@/lib/prisma';

// ── POST handler ──────────────────────────────────────────────────────────────
// Saves the browser's PushSubscription object to the database.
// Expected JSON body: { endpoint: string, keys: { p256dh: string, auth: string } }
export async function POST(req: Request) {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID from the session cookie
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Only logged-in users can subscribe to push notifications
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse the JSON body.
  // The browser's PushSubscription serialises to { endpoint, keys: { p256dh, auth } }
  const body = await req.json();

  // Destructure the push subscription fields
  const { endpoint, keys } = body;

  // All three values are required to send encrypted push notifications.
  // If any are missing, the subscription is invalid and we must reject it.
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription object.' }, { status: 400 });
  }

  // Upsert the push subscription.
  // "Upsert" means: UPDATE if a row with this endpoint already exists,
  //                 CREATE a new row if it doesn't.
  // The endpoint is globally unique per browser push channel, so it's the right key.
  await prisma.pushSubscription.upsert({
    where: {
      // Unique key — each endpoint URL maps to exactly one subscription row
      endpoint,
    },
    // If a row with this endpoint exists, refresh the keys and re-link to the user.
    // This handles key rotation: the endpoint stays the same but keys change.
    update: {
      p256dh: keys.p256dh,
      auth:   keys.auth,
      userId,
    },
    // If no row exists yet, create a new subscription record
    create: {
      endpoint,
      p256dh: keys.p256dh,
      auth:   keys.auth,
      userId,
    },
  });

  // Return a simple success response
  return NextResponse.json({ ok: true });
}
