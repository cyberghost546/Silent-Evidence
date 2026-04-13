// ============================================================
//  app/api/messages/route.ts
//
//  Direct messaging between two site users.
//
//  GET  /api/messages?with=<userId>
//    → Returns the full conversation thread between the logged-in
//      user and the specified partner, oldest message first.
//      Also marks all unread messages FROM the partner as read.
//
//  POST /api/messages
//    → Sends a new direct message to a specified recipient.
//      Creates an in-app notification AND pushes the message to the
//      recipient's browser in real time via Pusher WebSocket.
//
//  Constraints:
//    - Must be logged in for both methods
//    - Cannot message yourself
//    - Message content is capped at 2000 characters
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Import the Pusher helper that sends a real-time event to the recipient's browser.
// If Pusher is not configured, this function is a no-op (does nothing safely).
import { pushNewMessage } from '@/lib/pusher';

// ── GET /api/messages?with=<userId> ───────────────────────────────────────────
// Returns all messages in the thread between the caller and a given user.
export async function GET(req: Request) {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID from the session cookie
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to read messages
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the URL so we can read the ?with= query parameter
  const { searchParams } = new URL(req.url);

  // Read the ID of the conversation partner from the query string.
  // e.g. /api/messages?with=42  →  withId = 42
  const withId = Number(searchParams.get('with'));

  // withId is required — without it we don't know which conversation to fetch
  if (!withId) return NextResponse.json({ error: 'with param required.' }, { status: 400 });

  // Fetch all messages that were sent between these two users in either direction.
  // OR means: return messages where (sender=me AND receiver=them) OR (sender=them AND receiver=me)
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        // Messages the logged-in user sent to the partner
        { senderId: userId, receiverId: withId },
        // Messages the partner sent to the logged-in user
        { senderId: withId, receiverId: userId },
      ],
    },
    // Oldest message first — chronological order is natural for a chat view
    orderBy: { createdAt: 'asc' },
    select: {
      // Primary key for the message
      id: true,
      // The message text
      content: true,
      // Whether the recipient has read it (used to show "read receipts")
      read: true,
      // When the message was sent
      createdAt: true,
      // Who sent the message (used to align left/right in the chat UI)
      senderId: true,
      // Who received the message
      receiverId: true,
      // Include the sender's username and avatar so the chat bubble has an author header
      sender: { select: { username: true, profile: { select: { avatar: true } } } },
    },
  });

  // Mark all unread messages FROM the partner as read now that we've fetched the thread.
  // This is the "mark as read on open" pattern — identical to how email clients work.
  // updateMany runs a single SQL UPDATE affecting multiple rows efficiently.
  await prisma.directMessage.updateMany({
    where: {
      // Only messages the PARTNER sent (not our own messages)
      senderId: withId,
      // Only messages addressed TO us
      receiverId: userId,
      // Only those not already marked as read
      read: false,
    },
    // Flip the read flag to true for all matching rows
    data: { read: true },
  });

  // Return the full list of messages in this conversation
  return NextResponse.json(messages);
}

// ── POST /api/messages ────────────────────────────────────────────────────────
// Sends a new direct message from the logged-in user to a specified recipient.
// Expected JSON body: { receiverId: number, content: string }
export async function POST(req: Request) {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID — this is the message sender
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to send a message
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the JSON body to get the recipient and message text
  const { receiverId, content } = await req.json();

  // Both fields are required — reject if either is missing or blank
  if (!receiverId || !content?.trim()) {
    return NextResponse.json({ error: 'receiverId and content are required.' }, { status: 400 });
  }

  // Enforce a 2000-character cap to prevent extremely long messages
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars).' }, { status: 400 });
  }

  // Prevent users from messaging themselves — it creates a confusing UX
  if (receiverId === userId) {
    return NextResponse.json({ error: 'Cannot message yourself.' }, { status: 400 });
  }

  // Insert the new message into the database and return it with the sender's details
  const message = await prisma.directMessage.create({
    data: {
      // The logged-in user is the sender
      senderId: userId,
      // The target user is the receiver
      receiverId,
      // Store the trimmed content
      content: content.trim(),
    },
    // Include sender details so the real-time push payload and response are complete
    select: {
      id: true,
      content: true,
      // New messages start as unread (false is the default in the schema)
      read: true,
      createdAt: true,
      senderId: true,
      receiverId: true,
      // Sender's username and avatar for the chat bubble header
      sender: { select: { username: true, profile: { select: { avatar: true } } } },
    },
  });

  // ── In-app notification ──────────────────────────────────────────────────────
  // Fetch the sender's username to personalise the notification message
  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  // Create a DIRECT_MESSAGE notification for the recipient — fire and forget.
  // .catch(() => {}) means an error here won't break the message send response.
  prisma.notification.create({
    data: {
      // The recipient gets the notification
      userId: receiverId,
      // DIRECT_MESSAGE type lets the UI render a chat bubble icon
      type: 'DIRECT_MESSAGE',
      // Human-readable message shown in the notification panel
      message: `${sender?.username ?? 'Someone'} sent you a message.`,
    },
  }).catch(() => {});

  // ── Real-time push via Pusher ────────────────────────────────────────────────
  // Push the new message to the recipient's browser over a WebSocket channel.
  // This makes the message appear instantly without the recipient needing to refresh.
  // If Pusher is not configured (env vars missing), pushNewMessage is a silent no-op.
  pushNewMessage(receiverId, {
    // The message's unique ID
    id: message.id,
    // The message text
    content: message.content,
    // Who sent it (for the recipient to identify the conversation)
    senderId: message.senderId,
    // The sender's username for display in the real-time notification banner
    senderUsername: message.sender.username,
    // ISO string timestamp for the Pusher payload (Dates don't serialise automatically)
    createdAt: message.createdAt.toISOString(),
  });

  // Return the created message with HTTP 201 Created
  return NextResponse.json(message, { status: 201 });
}
