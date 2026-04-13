// app/api/bookmarks/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles POST /api/bookmarks — toggling a bookmark on a story.
//
// "Toggle" means calling this endpoint twice will first save a story, then un-save it.
// This pattern is common for like/bookmark/follow buttons — one endpoint handles both
// the add and the remove action based on whether a record already exists.
//
// The response tells the client the new state: { bookmarked: true } or { bookmarked: false }.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to read and write bookmark records
import { prisma } from '@/lib/prisma';

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/bookmarks.
// "req" is a standard Web API Request containing the storyId in its JSON body.
export async function POST(req: Request) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Read the cookie store from this request
  const cookieStore = await cookies();

  // Get the userId value from the 'userId' cookie.
  // The ?. optional chain prevents an error if the cookie doesn't exist.
  // ?? 0 provides a fallback of 0 if the value is null/undefined.
  // Number() converts the string cookie value to an integer.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0 (falsy), the user is not logged in — reject the request
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // ── Input validation ──────────────────────────────────────────────────────
  // Parse the JSON body to get the story to bookmark/unbookmark
  const { storyId } = await req.json();

  // storyId is required — we can't bookmark without knowing which story
  if (!storyId) return NextResponse.json({ error: 'Missing storyId.' }, { status: 400 });

  // ── Toggle logic ──────────────────────────────────────────────────────────
  // Check if a bookmark already exists for this exact user + story combination.
  // The composite unique constraint (userId_storyId) in the database ensures
  // there can never be more than one bookmark per user per story.
  const existing = await prisma.bookmark.findUnique({
    where: { userId_storyId: { userId, storyId: Number(storyId) } },
  });

  // If a bookmark record was found, the user has already saved this story.
  // Delete the record to "un-save" it and return bookmarked: false.
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  }

  // No existing bookmark found — create a new one to "save" the story.
  // Number(storyId) ensures it's stored as an integer even if it arrived as a string.
  await prisma.bookmark.create({ data: { userId, storyId: Number(storyId) } });

  // Return bookmarked: true so the button in the UI can switch to its "saved" state
  return NextResponse.json({ bookmarked: true });
}
