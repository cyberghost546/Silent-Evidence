// ============================================================
//  app/api/reading-history/route.ts
//
//  Tracks which stories a logged-in user has read and maintains
//  their reading streak (consecutive days of reading).
//
//  GET  /api/reading-history
//    → Returns all stories the logged-in user has read, newest
//      read first.  Each entry includes full story details
//      (title, slug, cover, excerpt, author, category, counts)
//      so the Reading History page can display rich cards.
//
//  POST /api/reading-history
//    → Records that the user read a specific story.
//      Uses upsert so calling it multiple times for the same story
//      just refreshes the `readAt` timestamp instead of duplicating rows.
//      Also updates the user's reading streak counter.
// ============================================================

// Import NextRequest (typed request) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── Helper: read the logged-in user's ID from the session cookie ──────────────
// Returns null if the user is not logged in, allowing clean conditional logic.
function getUserId() {
  // cookies() returns a Promise — we chain .then() to extract the value
  return cookies().then(c => Number(c.get('userId')?.value ?? 0) || null);
}

// ── GET /api/reading-history ───────────────────────────────────────────────────
// Returns the complete reading history for the logged-in user.
export async function GET() {
  // Check whether the user is logged in
  const userId = await getUserId();

  // Guests don't have reading history — return 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all reading history entries for this user from the database
  const history = await prisma.readingHistory.findMany({
    where: {
      // Only this user's history
      userId,
    },
    // Most recently read story first
    orderBy: { readAt: 'desc' },
    // Include full story details so the history page can render rich cards
    include: {
      story: {
        select: {
          // Story's unique ID and URL slug
          id: true,
          title: true,
          slug: true,
          // Cover image URL for the story card thumbnail
          coverImage: true,
          // Short summary shown on the card
          excerpt: true,
          // Full content — included for word count calculations in the UI
          content: true,
          // When the story was originally published
          createdAt: true,
          // Author's username for the "by username" label
          author:   { select: { username: true } },
          // Category details for the tag badge on the card
          category: { select: { name: true, slug: true } },
          // Like and comment counts for the engagement stats
          _count:   { select: { likes: true, comments: true } },
        },
      },
    },
  });

  // Return the reading history array as JSON
  return NextResponse.json(history);
}

// ── POST /api/reading-history ──────────────────────────────────────────────────
// Records (or refreshes) the fact that the user read a specific story.
// Expected JSON body: { storyId: number }
export async function POST(req: NextRequest) {
  // Check whether the user is logged in
  const userId = await getUserId();

  // Guests cannot have reading history saved
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse the JSON body to get the story that was read
  const { storyId } = await req.json();

  // Validate: storyId must be provided AND must be a number (not a string or null)
  if (!storyId || typeof storyId !== 'number') {
    return NextResponse.json({ error: 'Invalid storyId' }, { status: 400 });
  }

  // Upsert the reading history entry.
  // "Upsert" means:
  //   - If this user has already read this story → UPDATE the readAt timestamp
  //   - If this is the first time → CREATE a new row
  // The composite unique key userId_storyId ensures at most one row per (user, story) pair.
  await prisma.readingHistory.upsert({
    where: {
      // Composite unique key: match on both userId AND storyId
      userId_storyId: { userId, storyId },
    },
    // Already exists — refresh the timestamp to "now" so it floats to the top of history
    update: { readAt: new Date() },
    // First time reading — create a new entry (readAt defaults to now via schema)
    create: { userId, storyId },
  });

  // Update the user's reading streak after recording this read
  await updateReadingStreak(userId);

  // Return a simple success response
  return NextResponse.json({ ok: true });
}

// ── updateReadingStreak ────────────────────────────────────────────────────────
// Maintains the user's daily reading streak counter.
//
// Logic:
//   - If no streak record exists → create one (streak = 1)
//   - If already updated today   → do nothing (no double-counting same day)
//   - If last read was yesterday → extend streak by 1
//   - If last read was earlier   → reset streak to 1 (missed a day)
//
// Uses UTC dates to ensure the day boundary is consistent for all users
// regardless of their timezone.
async function updateReadingStreak(userId: number) {
  // Get the current UTC date and time
  const now = new Date();

  // Format today's date as "YYYY-MM-DD" for easy string comparison.
  // .toISOString() gives "2024-03-15T10:30:00.000Z"; .slice(0,10) gives "2024-03-15"
  const todayStr = now.toISOString().slice(0, 10);

  // Look up the user's existing reading streak record
  const streak = await prisma.readingStreak.findUnique({ where: { userId } });

  if (!streak) {
    // First time this user has ever read anything — start their streak at 1
    await prisma.readingStreak.create({
      data: {
        userId,
        // Starting streak of 1 day
        currentStreak: 1,
        // The longest streak is also 1 at the start
        longestStreak: 1,
        // Record when they last read (now)
        lastReadAt: now,
      },
    });
    return;
  }

  // Format the last read date as "YYYY-MM-DD" for comparison.
  // If lastReadAt is null (edge case), use an empty string which won't match any date.
  const lastStr = streak.lastReadAt ? streak.lastReadAt.toISOString().slice(0, 10) : '';

  // If lastReadAt is already today, we've already counted a read today — skip
  if (lastStr === todayStr) return;

  // Compute yesterday's date string for the consecutive-day check
  const yesterday = new Date(now);
  // setDate() mutates the date — subtracting 1 gives us yesterday
  yesterday.setDate(yesterday.getDate() - 1);
  // Format yesterday as "YYYY-MM-DD"
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Determine the new streak length:
  //   If the user read YESTERDAY → they maintained the streak → add 1
  //   If the last read was any earlier → they missed a day → reset to 1
  const newCurrent = lastStr === yesterdayStr ? streak.currentStreak + 1 : 1;

  // The longest streak is the max of the current record and the new streak length
  const newLongest = Math.max(streak.longestStreak, newCurrent);

  // Update the streak record with the new values
  await prisma.readingStreak.update({
    where: { userId },
    data: {
      // Updated current streak length
      currentStreak: newCurrent,
      // Updated all-time longest streak
      longestStreak: newLongest,
      // Record the new last-read timestamp
      lastReadAt: now,
    },
  });
}
