// ============================================================
//  app/api/scare-rating/route.ts
//
//  Manages the "Scare Rating" system — users rate how scary a
//  story is on a 1–5 skull scale (1 = mildly creepy, 5 = nightmare fuel).
//
//  POST /api/scare-rating
//    → Saves or updates the logged-in user's skull rating for a story.
//      Uses upsert so submitting again just overwrites the previous rating.
//      Returns the updated average rating and the total number of raters.
//
//  GET  /api/scare-rating?storyId=X
//    → Returns the average rating, total rater count, and the
//      logged-in user's own rating (or null if they haven't rated yet).
//      Public — non-logged-in users can see the aggregate but get
//      userRating: null since they have no personal rating.
// ============================================================

// Import NextRequest (typed request with .nextUrl helper) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── Helper: read the logged-in user's ID from the session cookie ──────────────
// Returns the numeric userId, or null if not logged in.
async function getUserId() {
  // Await the cookie store (required in Next.js App Router)
  const c = await cookies();
  // Convert to number; return null instead of 0 so callers can use a simple if check
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── POST /api/scare-rating ─────────────────────────────────────────────────────
// Saves (or updates) the logged-in user's scare rating for a story.
// Expected JSON body: { storyId: number, rating: number (1–5) }
export async function POST(req: NextRequest) {
  // Check whether the user is logged in
  const userId = await getUserId();

  // Guests cannot submit scare ratings
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse the JSON body to get the story and rating value
  const { storyId, rating } = await req.json();

  // Validate: storyId must be provided, rating must be a number between 1 and 5 inclusive.
  // typeof rating !== 'number' guards against string values like "3".
  // rating < 1 || rating > 5 enforces the 1–5 skull scale.
  if (!storyId || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Upsert the scare rating.
  // "Upsert" means:
  //   - If this user has already rated this story → UPDATE the rating value
  //   - If this is the first rating from this user → CREATE a new row
  // The @@unique([userId, storyId]) constraint ensures at most one rating per (user, story).
  await prisma.scareRating.upsert({
    where: {
      // Composite unique key: match on both userId AND storyId
      userId_storyId: { userId, storyId },
    },
    // The user is changing their existing rating — overwrite with the new value
    update: { rating },
    // First time rating this story — create a new row with all fields
    create: { userId, storyId, rating },
  });

  // Recalculate the aggregate stats after saving.
  // We always return fresh data so the UI doesn't need to manually compute averages.
  const agg = await prisma.scareRating.aggregate({
    where: {
      // Only ratings for this specific story
      storyId,
    },
    // Calculate the average of all `rating` column values
    _avg: { rating: true },
    // Count how many users have rated this story
    _count: { rating: true },
  });

  // Return the updated stats plus the user's own submitted rating
  return NextResponse.json({
    // _avg.rating can be null if there are no ratings — ?? 0 defaults to 0
    avg: agg._avg.rating ?? 0,
    // Total number of users who have rated this story
    count: agg._count.rating,
    // Echo back the rating the user just submitted — saves an extra GET call
    userRating: rating,
  });
}

// ── GET /api/scare-rating?storyId=X ───────────────────────────────────────────
// Returns the aggregate scare rating stats for a story, plus the caller's own rating.
export async function GET(req: NextRequest) {
  // Read the storyId query parameter from the URL.
  // req.nextUrl.searchParams is available on NextRequest (not plain Request).
  const storyId = Number(req.nextUrl.searchParams.get('storyId'));

  // storyId is required — reject if missing or non-numeric
  if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

  // Check if the user is logged in (null for guests)
  const userId = await getUserId();

  // Run both queries simultaneously for speed:
  //   agg     — the average rating and total count for this story
  //   userRow — this user's personal rating row (null if not logged in or not yet rated)
  const [agg, userRow] = await Promise.all([
    // Aggregate all ratings for this story
    prisma.scareRating.aggregate({
      where: { storyId },
      // Average of all ratings (null if no ratings yet)
      _avg: { rating: true },
      // Total number of raters
      _count: { rating: true },
    }),

    // Look up this specific user's rating — or skip the query entirely for guests.
    // If userId is null (guest), we skip the query and return null directly.
    userId
      ? prisma.scareRating.findUnique({
          where: {
            // Composite unique key
            userId_storyId: { userId, storyId },
          },
        })
      : null,
  ]);

  // Return the story's rating data
  return NextResponse.json({
    // Community average rating (0 if no one has rated yet)
    avg: agg._avg.rating ?? 0,
    // How many users have submitted a rating
    count: agg._count.rating,
    // This user's own rating, or null if they haven't rated (or are a guest)
    userRating: userRow?.rating ?? null,
  });
}
