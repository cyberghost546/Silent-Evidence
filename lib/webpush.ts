// lib/webpush.ts
// Server-side Web Push helper. Sends push notifications to subscribed browsers.
//
// Setup required in .env:
//   VAPID_EMAIL=mailto:admin@silentevidence.com
//   VAPID_PUBLIC_KEY=<from: npx web-push generate-vapid-keys>
//   VAPID_PRIVATE_KEY=<from: npx web-push generate-vapid-keys>
//
// NEXT_PUBLIC_VAPID_PUBLIC_KEY must equal VAPID_PUBLIC_KEY
// (the public key is shared with the browser to subscribe).

import webpush from 'web-push';
import { prisma } from './prisma';

// Configure VAPID credentials once — required before any send
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:admin@silentevidence.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;   // page to open when the notification is clicked
  icon?: string;  // notification icon (defaults to /icon-192.png)
};

// Sends a push notification to every active subscription for a user.
// Stale/expired subscriptions (410 Gone) are removed automatically.
export async function sendPushToUser(userId: number, payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY) return; // push not configured — skip silently

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const expiredIds: number[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url ?? '/',
            icon: payload.icon ?? '/icon-192.png',
          }),
        );
      } catch (err: unknown) {
        // 410 Gone or 404 means the subscription is expired — mark for cleanup
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          expiredIds.push(sub.id);
        }
      }
    }),
  );

  // Remove expired subscriptions so we don't keep trying to send to them
  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
  }
}
