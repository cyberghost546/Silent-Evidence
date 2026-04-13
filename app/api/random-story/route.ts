// ============================================================
//  app/api/random-story/route.ts
//
//  GET /api/random-story
//
//  Returns the slug of a randomly selected published story.
//  Used by the "Surprise Me" / "Random Story" button in the UI —
//  when clicked, the browser is redirected to that story's page.
//
//  Algorithm:
//    1. Count all published stories.
//    2. Pick a random number between 0 and (count - 1).
//    3. Use Prisma's `skip` to jump to that position in the list.
//    4. Return the story's slug.
//
//  This is a simple but efficient approach for small-to-medium
//  collections.  For very large collections (100 k+ stories) a
//  different algorithm (e.g. random UUID sampling) would be faster.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the Prisma database client for DB queries
import { prisma } from '@/lib/prisma';

// ── GET handler ───────────────────────────────────────────────────────────────
// Returns a random published story slug.
// Public endpoint — no login required.
export async function GET() {
  // Count how many published stories exist in total.
  // We need this to calculate a valid random skip value.
  const count = await prisma.story.count({
    where: {
      // Only consider publicly visible, published stories
      status: 'PUBLISHED',
    },
  });

  // If there are no published stories at all, return a 404 error.
  // The UI can then show a "No stories yet" message instead of redirecting.
  if (count === 0) return NextResponse.json({ error: 'No stories.' }, { status: 404 });

  // Generate a random integer between 0 and (count - 1) inclusive.
  // Math.random() returns a float in [0, 1) → multiplying by count gives [0, count).
  // Math.floor() rounds down to the nearest integer, giving a valid row offset.
  const skip = Math.floor(Math.random() * count);

  // Fetch the single story at the randomly chosen position.
  // `skip` tells Prisma to skip that many rows before returning the first result.
  // orderBy is not set here — Prisma returns rows in a consistent (usually insertion) order,
  // which is fine since we're picking a random skip offset.
  const story = await prisma.story.findFirst({
    where: {
      // Only published stories
      status: 'PUBLISHED',
    },
    // Jump to the randomly chosen position in the result set
    skip,
    // We only need the slug — the client uses it to build the story URL
    select: { slug: true },
  });

  // Return the story slug.
  // story?.slug handles the edge case where story is null (very unlikely given the count check).
  return NextResponse.json({ slug: story?.slug });
}
