// ============================================================
//  app/api/likes/route.ts
//
//  POST /api/likes
//
//  Toggles a like on a story for the currently logged-in user.
//  Works as a toggle:
//    - If the user HAS NOT liked the story → adds a like
//    - If the user HAS already liked it    → removes the like
//
//  Returns: { liked: boolean, count: number }
//    liked — new state after the toggle
//    count — updated total like count for the story
//
//  Side effects on a new like:
//    1. In-app notification to the story author (fire-and-forget)
//    2. Badge check for the author — in case they hit a milestone
//       like "10 likes received" (fire-and-forget)
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Import the badge-awarding helper — checks if the author has hit a badge milestone
import { checkAndAwardBadges } from '@/lib/badges';

// ── POST handler ──────────────────────────────────────────────────────────────
// Toggles the like state for the current user on the given story.
export async function POST(req: Request) {

  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the userId cookie and convert it to a number.
  // This identifies who is clicking the Like button.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to like a story
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the JSON body to get the story being liked
  const { storyId } = await req.json();

  // storyId is required — reject if it's missing
  if (!storyId) return NextResponse.json({ error: 'Missing storyId.' }, { status: 400 });

  // Check whether the user has already liked this story.
  // The schema has a @@unique([userId, storyId]) constraint on the Like model,
  // so there can be at most one like per (user, story) pair.
  const existing = await prisma.like.findUnique({
    where: {
      // Composite unique key
      userId_storyId: { userId, storyId },
    },
  });

  // ── Unlike branch ───────────────────────────────────────────────────────
  // A like record already exists — the user is un-liking the story
  if (existing) {
    // Delete the like row by its primary key
    await prisma.like.delete({ where: { id: existing.id } });

    // Count the remaining likes after deletion so the UI can update the number
    const count = await prisma.like.count({ where: { storyId } });

    // Return { liked: false } and the new total count
    return NextResponse.json({ liked: false, count });
  }

  // ── Like branch ─────────────────────────────────────────────────────────
  // No existing like — create one now
  await prisma.like.create({
    data: {
      // Link to the user who liked
      userId,
      // Link to the story being liked
      storyId,
    },
  });

  // Count total likes after adding the new one
  const count = await prisma.like.count({ where: { storyId } });

  // ── Notify the story author ─────────────────────────────────────────────
  // Look up the story to find the author's ID and title.
  // We need this to avoid notifying the author if they liked their own story,
  // and to include the storyId in the notification row.
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true, title: true },
  });

  // Only send a notification if the story exists AND the liker is not the author
  if (story && story.authorId !== userId) {

    // Fetch the liker's username so we can say "Alice liked your story"
    const liker = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // Create the in-app notification — fire and forget so a DB error doesn't
    // break the like response (.catch swallows any error silently)
    prisma.notification.create({
      data: {
        // Send the notification to the story's author
        userId: story.authorId,
        // LIKE type lets the UI render a heart icon or like-specific template
        type: 'LIKE',
        // Human-readable message for the notification panel
        message: `${liker?.username ?? 'Someone'} liked your story.`,
        // Include the storyId so the notification can link to the story
        storyId,
      },
    }).catch(() => {});
  }

  // ── Badge check ─────────────────────────────────────────────────────────
  // After a new like, check if the author has earned a badge milestone.
  // This is also fire-and-forget — a badge error must never break the like.
  if (story) checkAndAwardBadges(story.authorId).catch(() => {});

  // Return { liked: true } and the updated total like count
  return NextResponse.json({ liked: true, count });
}
