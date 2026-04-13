// ============================================================
//  app/api/follows/route.ts
//
//  POST /api/follows
//
//  Toggles a follow relationship between the currently logged-in
//  user (the follower) and another user (the person being followed).
//
//  If the caller already follows the target → un-follows them
//    (deletes the Follow row, returns { following: false })
//
//  If the caller doesn't yet follow the target → follows them
//    (creates a Follow row, returns { following: true })
//
//  On a new follow, three notification channels are triggered:
//    1. In-app notification  — stored in the DB and shown in the bell
//    2. Email notification   — sent via the mailer helper
//    3. Browser push notification — sent via Web Push if subscribed
//
//  All three notifications are "fire and forget" — errors there
//  never block the actual follow action.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Import the email notification helper for new follower emails
import { notifyNewFollower } from '@/lib/notifyEmail';

// Import the Web Push helper that sends browser push notifications to a user
import { sendPushToUser } from '@/lib/webpush';

// ── POST handler ──────────────────────────────────────────────────────────────
// Handles a click on the "Follow" or "Unfollow" button.
export async function POST(req: Request) {

  // Read all cookies from the request
  const cookieStore = await cookies();

  // Get the logged-in user's ID from the session cookie.
  // This is the person clicking the Follow button (the "follower").
  // Number() converts the string cookie value to a number.
  // ?? 0 falls back to "0" if the cookie is absent.
  const followerId = Number(cookieStore.get('userId')?.value ?? 0);

  // If no userId cookie exists, the user is not logged in — reject with 401
  if (!followerId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the request body to get the ID of the user being followed
  const { followingId } = await req.json();

  // Validate: followingId must be provided and must not be the same as the caller.
  // You cannot follow yourself — it would create confusing data.
  if (!followingId || followingId === followerId) {
    return NextResponse.json({ error: 'Invalid.' }, { status: 400 });
  }

  // Check whether a Follow record already exists between these two users.
  // The composite unique key followerId_followingId guarantees at most one row
  // per (follower, following) pair, so findUnique is the right method here.
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        // Ensure followingId is treated as a number
        followingId: Number(followingId),
      },
    },
  });

  // ── Un-follow branch ────────────────────────────────────────────────────
  // A record already exists, which means the user currently follows this person.
  // Clicking the button again should un-follow (toggle off).
  if (existing) {
    // Delete the Follow record by its primary key ID
    await prisma.follow.delete({ where: { id: existing.id } });
    // Return { following: false } so the button in the UI can flip to "Follow"
    return NextResponse.json({ following: false });
  }

  // ── Follow branch ───────────────────────────────────────────────────────
  // No existing record — create a new Follow relationship
  await prisma.follow.create({
    data: {
      followerId,
      followingId: Number(followingId),
    },
  });

  // Fetch both users' details simultaneously so we can personalise the notifications.
  // Promise.all runs both queries at the same time instead of one after the other.
  const [follower, followedUser] = await Promise.all([
    // The follower's username — used in notification messages like "Alice started following you"
    prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true },
    }),
    // The followed user's username and email — needed for the email notification
    prisma.user.findUnique({
      where: { id: Number(followingId) },
      select: { username: true, email: true },
    }),
  ]);

  // ── 1. In-app notification ──────────────────────────────────────────────
  // Create a notification row that will appear in the user's bell dropdown.
  // .catch(() => {}) means "fire and forget" — if this fails it doesn't matter,
  // the follow itself has already been saved and we don't want to return an error.
  prisma.notification.create({
    data: {
      // The notification belongs to the person who was just followed
      userId: Number(followingId),
      // The FOLLOW type lets the UI render a follow-specific icon or template
      type: 'FOLLOW',
      // Human-readable message shown in the notification panel
      message: `${follower?.username ?? 'Someone'} started following you.`,
    },
  }).catch(() => {});

  // Only send email and push if we successfully retrieved both user profiles
  if (follower && followedUser) {

    // ── 2. Email notification ─────────────────────────────────────────────
    // Send a "you have a new follower" email to the person who was followed.
    // Fire and forget — an email failure shouldn't fail the follow action.
    notifyNewFollower({
      toEmail: followedUser.email,
      toUsername: followedUser.username,
      followerUsername: follower.username,
    }).catch(() => {});

    // ── 3. Browser push notification ──────────────────────────────────────
    // Send a push notification to the followed user's browser (if they subscribed).
    // If they never granted notification permission, sendPushToUser does nothing.
    sendPushToUser(Number(followingId), {
      title: 'New follower',
      body: `${follower.username} started following you.`,
      // Link to the follower's profile so the receiver can check them out
      url: `/user/${follower.username}`,
    }).catch(() => {});
  }

  // Return { following: true } so the button in the UI can flip to "Following"
  return NextResponse.json({ following: true });
}
