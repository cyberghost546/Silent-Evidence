// ============================================================
//  app/api/series/route.ts
//
//  Manages story series — ordered collections of stories that form
//  a continuous narrative (e.g. "The Haunted Manor — Parts 1–5").
//
//  GET  /api/series
//    → Returns all series created by the logged-in user, newest first.
//      Each series includes a count of how many stories are in it.
//      Requires login (you can only see your own series here).
//
//  POST /api/series
//    → Creates a new empty series for the logged-in user.
//      A unique slug is auto-generated from the name and a random
//      4-character suffix to avoid collisions.
//      Required: name
//      Optional: description
// ============================================================

// Import NextRequest (typed request) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── Helper: read the logged-in user's ID from the session cookie ──────────────
// Returns the numeric userId, or null if not logged in.
async function getUserId() {
  // Await the cookie store (required in Next.js App Router server context)
  const c = await cookies();
  // Convert to number; return null instead of 0 for clean conditional checks
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── Helper: generate a URL-safe slug from a series name ──────────────────────
// Converts a human-readable name into a URL-safe identifier and appends a random
// 4-character suffix to guarantee uniqueness without querying the database.
//
// Examples:
//   "The Haunted Manor"  → "the-haunted-manor-a3f9"
//   "Gore & Guts!!!"    → "gore-guts-z2k1"
//
// Steps:
//   1. toLowerCase()        — "The Haunted Manor" → "the haunted manor"
//   2. .trim()              — removes leading/trailing spaces
//   3. replace non-alphanumeric/space/hyphen with ""  — removes special chars
//   4. replace whitespace groups with "-"             — spaces become hyphens
//   5. replace consecutive hyphens with one           — "my--series" → "my-series"
//   6. append "-" + 4 random chars from base-36       — guaranteed uniqueness
function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      // Remove any character that is not a letter, digit, space, or hyphen
      .replace(/[^a-z0-9\s-]/g, '')
      // Replace one or more whitespace characters with a single hyphen
      .replace(/\s+/g, '-')
      // Collapse multiple consecutive hyphens into one
      .replace(/-+/g, '-') +
    // Append a dash and 4 random alphanumeric characters (base-36 = 0-9 and a-z).
    // Math.random().toString(36) looks like "0.1hk3a8z"; .slice(2,6) takes 4 chars.
    '-' + Math.random().toString(36).slice(2, 6)
  );
}

// ── GET /api/series ────────────────────────────────────────────────────────────
// Returns all series owned by the logged-in user.
export async function GET() {
  // Check whether the user is logged in
  const userId = await getUserId();

  // Guests cannot view their series list
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all series created by this author
  const series = await prisma.series.findMany({
    where: {
      // Only series owned by this specific user
      authorId: userId,
    },
    // Newest series first
    orderBy: { createdAt: 'desc' },
    // Include a count of stories in each series without fetching all story rows
    include: { _count: { select: { stories: true } } },
  });

  // Return the series array as JSON
  return NextResponse.json(series);
}

// ── POST /api/series ───────────────────────────────────────────────────────────
// Creates a new series for the logged-in user.
// Expected JSON body: { name: string, description?: string }
export async function POST(req: NextRequest) {
  // Check whether the user is logged in
  const userId = await getUserId();

  // Guests cannot create series
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse the JSON body
  const { name, description } = await req.json();

  // Name is required and cannot be blank
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  // Create the series in the database
  const series = await prisma.series.create({
    data: {
      // Trimmed human-readable name
      name: name.trim(),
      // Auto-generated unique URL slug from the name + random suffix
      slug: slugify(name),
      // Optional description — null if not provided
      description: description?.trim() || null,
      // Link to the author who created this series
      authorId: userId,
    },
  });

  // Return 201 Created with the new series object
  return NextResponse.json(series, { status: 201 });
}
