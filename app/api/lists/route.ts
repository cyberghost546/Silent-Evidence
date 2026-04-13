// ============================================================
//  app/api/lists/route.ts
//
//  Manages the "Story Lists" feature — custom reading lists that
//  users can curate (like playlists but for horror stories).
//
//  GET  /api/lists
//    → Returns all lists owned by the logged-in user, sorted
//      by most recently updated.  Each list includes a count
//      of how many stories are in it.
//
//  POST /api/lists
//    → Creates a new empty list for the logged-in user.
//      Required: name
//      Optional: description, isPublic (defaults to true)
// ============================================================

// Import NextRequest (typed request with .nextUrl helper) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB queries
import { prisma } from '@/lib/prisma';

// ── Helper: extract userId from the session cookie ────────────────────────────
// Returns the numeric user ID, or null if no valid session cookie exists.
// Used by both GET and POST so it lives as a shared helper at the top.
async function getUserId() {
  // Await the cookie store (required in Next.js App Router server context)
  const c = await cookies();
  // Read 'userId', convert to number, fall back to null if missing or zero
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── GET /api/lists ─────────────────────────────────────────────────────────────
// Returns all reading lists owned by the logged-in user.
export async function GET() {
  // Check whether the user is logged in
  const userId = await getUserId();

  // Guests cannot have lists — return 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch every list that belongs to this user from the database
  const lists = await prisma.storyList.findMany({
    where: {
      // Only return lists owned by this specific user
      userId,
    },
    // Sort by last updated so the most recently modified list appears first
    orderBy: { updatedAt: 'desc' },
    // Include a count of how many stories are in each list.
    // _count avoids fetching every item row just to get a number.
    include: { _count: { select: { items: true } } },
  });

  // Return the array of lists as JSON
  return NextResponse.json(lists);
}

// ── POST /api/lists ────────────────────────────────────────────────────────────
// Creates a new story list for the logged-in user.
// Expected JSON body: { name: string, description?: string, isPublic?: boolean }
export async function POST(req: NextRequest) {
  // Check whether the user is logged in
  const userId = await getUserId();

  // Guests cannot create lists — return 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse the JSON body to get the list details
  const { name, description, isPublic } = await req.json();

  // The list name is required — reject if it's missing or only whitespace
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  // Insert the new list into the database
  const list = await prisma.storyList.create({
    data: {
      // Trim the name to remove any leading/trailing whitespace
      name: name.trim(),
      // Store an optional description, or null if not provided
      description: description?.trim() || null,
      // Default isPublic to true unless the caller explicitly passes false.
      // isPublic !== false means: if isPublic is true, undefined, or null → store true;
      // only if isPublic is literally the boolean false → store false
      isPublic: isPublic !== false,
      // Link the list to the logged-in user who created it
      userId,
    },
  });

  // Return 201 Created with the newly created list object
  return NextResponse.json(list, { status: 201 });
}
