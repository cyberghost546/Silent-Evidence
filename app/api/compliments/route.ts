// app/api/compliments/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles POST /api/compliments — sending a one-click compliment
// from one user to another (typically a reader complimenting a story author).
//
// How it works:
//   - The sender picks one of a fixed list of preset compliment messages.
//   - The message is saved as a DirectMessage from the sender to the recipient.
//   - A notification is fired to the recipient so they see it in their inbox.
//
// Protections built in:
//   - Only logged-in users can send compliments (auth check via session cookie).
//   - Users cannot compliment themselves.
//   - Only preset messages from ALLOWED_COMPLIMENTS are accepted (no free-text spam).
//   - A user can only send ONE compliment to the same recipient every 24 hours
//     (prevents compliment bombing).
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to check, create, and query records
import { prisma } from '@/lib/prisma';

// Import pre-built error response helpers for consistent HTTP error responses:
// unauthorized    — 401 when the user is not logged in
// badRequest      — 400 for invalid input or rule violations
// serverError     — 500 for unexpected failures
// tooManyRequests — 429 when the 24-hour rate limit is exceeded
// notFound        — 404 when the recipient user doesn't exist
import {
  unauthorized,
  badRequest,
  serverError,
  tooManyRequests,
  notFound,
} from '@/lib/apiError';

// ── Whitelist of allowed compliment messages ───────────────────────────────────
// Using a Set gives O(1) lookup — has() is very fast no matter how many items are in it.
// Only messages that appear in this Set can be sent — the endpoint rejects anything else.
// This prevents users from sending arbitrary text through the compliment system.
// Whitelist of allowed compliment messages — prevents arbitrary text being sent
const ALLOWED_COMPLIMENTS = new Set([
  "Your writing genuinely scared me — great work! 🖤",
  "I couldn't stop reading. Incredible story!",
  "The atmosphere you created was perfect 🕯️",
  "This gave me chills. Please write more!",
  "You have a real talent for anime writing. Keep going 🙌",
]);

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/compliments.
// "req" is a standard Web API Request containing the recipient and message in its JSON body.
export async function POST(req: Request) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    // Read the session cookie to identify which user is sending the compliment
    // Read the logged-in sender's ID from the session cookie
    const cookieStore = await cookies();

    // Extract the userId from the cookie; default to 0 if the cookie is missing.
    // Number() converts the string cookie value to an integer.
    const fromUserId = Number(cookieStore.get('userId')?.value ?? 0);

    // If fromUserId is 0 (falsy), the user is not logged in — reject with 401 Unauthorized
    if (!fromUserId) return unauthorized();

    // ── Parse the request body ────────────────────────────────────────────────
    // Read the JSON body sent by the compliment button in the UI
    const body = await req.json();

    // Extract the recipient's user ID and convert it to a number.
    // Number() handles both string and number inputs from the JSON body.
    const toUserId = Number(body?.toUserId);

    // Extract the compliment text; default to empty string if not provided.
    // The type annotation `: string` ensures TypeScript knows this is always a string.
    const text: string = body?.text ?? '';

    // ── Input validation ──────────────────────────────────────────────────────
    // Both toUserId and a non-empty message are required
    // Basic input validation
    if (!toUserId || !text.trim()) {
      return badRequest('toUserId and text are required.');
    }

    // ── Self-compliment prevention ─────────────────────────────────────────────
    // A user cannot send a compliment to themselves — that would be meaningless and abusable
    // Prevent users from complimenting themselves
    if (toUserId === fromUserId) {
      return badRequest('You cannot send a compliment to yourself.');
    }

    // ── Whitelist validation ──────────────────────────────────────────────────
    // Reject any message that isn't in the approved list.
    // .trim() ensures trailing spaces don't cause false mismatches.
    // Only allow preset compliment messages to avoid spam / abuse
    if (!ALLOWED_COMPLIMENTS.has(text.trim())) {
      return badRequest('Invalid compliment text.');
    }

    // ── Recipient existence check ─────────────────────────────────────────────
    // Verify the recipient actually has an account — we can't send a message to
    // a user ID that doesn't exist in the database
    // Confirm the recipient actually exists
    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true }, // we only need the id to confirm existence
    });

    // If no user was found with this ID, return 404 Not Found
    if (!recipient) return notFound('User not found.');

    // ── Rate limit: one compliment per sender per recipient per 24 hours ──────
    // Calculate the timestamp for exactly 24 hours ago
    // ── Rate limit: one compliment per sender per recipient per 24 hours ──
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 86,400,000 ms = 24 hours

    // Search for any compliment sent from this user to this recipient within the last 24 hours.
    // We identify compliments by checking if the message content is in our whitelist.
    const recentCompliment = await prisma.directMessage.findFirst({
      where: {
        senderId: fromUserId,     // must be from this sender
        receiverId: toUserId,     // must be to this recipient
        // We detect compliments by checking if the content is in our preset list
        content: { in: [...ALLOWED_COMPLIMENTS] }, // spread the Set into an array for Prisma's 'in' filter
        createdAt: { gte: oneDayAgo },             // 'gte' = greater than or equal to — within last 24h
      },
      select: { id: true }, // we only need to know if any record exists, not its full contents
    });

    // If a recent compliment was found, the user has already used their daily allowance
    if (recentCompliment) {
      return tooManyRequests(
        'You already sent a compliment to this author in the last 24 hours.'
      );
    }

    // ── Create the DirectMessage record ───────────────────────────────────────
    // All validation passed — save the compliment as a DirectMessage in the database.
    // DirectMessage is the same model used for regular DMs — compliments are just
    // DMs with a preset message, so they appear naturally in the recipient's inbox.
    // ── Create the DirectMessage record ──────────────────────────────────────
    await prisma.directMessage.create({
      data: {
        senderId: fromUserId,   // the logged-in user who sent the compliment
        receiverId: toUserId,   // the user receiving the compliment
        content: text.trim(),   // the normalised compliment text
      },
    });

    // ── Fire a notification to the recipient ──────────────────────────────────
    // Fetch the sender's username to personalise the notification message.
    // This is a separate query after creating the DM to keep things fast.
    // Fire a notification to the recipient (non-blocking — failure doesn't break the response)
    const sender = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { username: true }, // only the username is needed for the notification text
    });

    // Create the notification record — we use .catch(() => {}) so that if the
    // notification creation fails (e.g. a DB error), it doesn't cause the whole
    // request to fail. Notifications are best-effort — the compliment was already saved.
    prisma.notification.create({
      data: {
        userId: toUserId,  // deliver the notification to the recipient
        type: 'DIRECT_MESSAGE', // notification type (used by the UI to choose an icon)
        // ?? 'Someone' fallback handles the rare case where the sender query returned null
        message: `${sender?.username ?? 'Someone'} sent you a compliment 💌`,
      },
    }).catch(() => {}); // swallow errors — notification is best-effort

    // Return 201 Created — the compliment was saved and the notification was fired
    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (err) {
    // Log the error server-side for debugging (includes the compliment route for easy filtering)
    console.error('[POST /api/compliments]', err);

    // Return a generic 500 — never expose internal details to the client
    return serverError();
  }
}
