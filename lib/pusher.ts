// lib/pusher.ts
// Server-side Pusher client for triggering real-time events.
// Used by API routes to push messages, reading room updates, and notifications
// to connected clients without them needing to poll.
//
// Environment variables required:
//   PUSHER_APP_ID      — Pusher app ID (from dashboard.pusher.com)
//   PUSHER_KEY         — Pusher app key (public, also used by the client)
//   PUSHER_SECRET      — Pusher app secret (server-only, never expose to client)
//   PUSHER_CLUSTER     — Pusher cluster region (e.g. "us2", "eu", "ap1")
//
// If these aren't set, all trigger calls silently no-op so the app works
// without Pusher (just falls back to the existing polling behavior).

import Pusher from 'pusher';

// Singleton — reuse across hot reloads in Next.js dev mode
const globalForPusher = globalThis as typeof globalThis & { __pusher?: Pusher | null };

function createPusher(): Pusher | null {
  // All four env vars are required — skip initialization if any are missing
  const appId   = process.env.PUSHER_APP_ID;
  const key     = process.env.PUSHER_KEY;
  const secret  = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    // No Pusher config — real-time features disabled, polling still works
    return null;
  }

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
}

// Get or create the Pusher instance (singleton across hot reloads)
function getPusher(): Pusher | null {
  if (!globalForPusher.__pusher) {
    globalForPusher.__pusher = createPusher();
  }
  return globalForPusher.__pusher;
}

// ── Channel naming conventions ──────────────────────────────────────────────
// Private user channel: "private-user-{userId}" — for DMs, notifications
// Reading room channel: "presence-room-{code}"  — for reading room progress
// Public channels:      "stories"               — for new story notifications

// ── Event helpers ───────────────────────────────────────────────────────────

/**
 * Trigger a new direct message event to the receiver's private channel.
 * Called from POST /api/messages when a message is sent.
 */
export async function pushNewMessage(receiverId: number, message: {
  id: number;
  content: string;
  senderId: number;
  senderUsername: string;
  createdAt: string;
}) {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(`private-user-${receiverId}`, 'new-message', message);
  } catch (err) {
    console.warn('[pusher] Failed to push new-message:', err);
  }
}

/**
 * Trigger a reading room member update (join, leave, or progress change).
 * Called from PATCH /api/reading-rooms/[code] when a member updates.
 */
export async function pushRoomUpdate(roomCode: string, members: {
  userId: number;
  username: string;
  progress: number;
}[]) {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(`room-${roomCode}`, 'room-update', { members });
  } catch (err) {
    console.warn('[pusher] Failed to push room-update:', err);
  }
}

/**
 * Trigger a notification event to a user's private channel.
 * Called when a new notification is created (like, comment, follow, etc.)
 */
export async function pushNotification(userId: number, notification: {
  id: number;
  type: string;
  message: string;
}) {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(`private-user-${userId}`, 'notification', notification);
  } catch (err) {
    console.warn('[pusher] Failed to push notification:', err);
  }
}

export { getPusher };
