// app/api/admin/story-of-week/route.ts
// This file manages the "Story of the Week" pin — a single highlighted story
// displayed prominently on the homepage or sidebar.
//
// POST   /api/admin/story-of-week — admin only: pin a specific story as Story of the Week.
//                                   Body: { storyId: number }
//                                   The story must be PUBLISHED (drafts cannot be featured).
// DELETE /api/admin/story-of-week — admin only: clear the current Story of the Week pin.
//
// HOW THE PIN IS STORED:
//   The selected story's ID is stored as a string value in the SiteSetting table
//   under the key "story_of_week_id".  Using a key-value settings table means we
//   can add new site-wide settings later without schema changes.
//   Using upsert (update-or-create) means we don't need to know whether a pin already exists.
//
// HOW TO CLEAR IT:
//   DELETE simply removes the "story_of_week_id" row from SiteSetting.
//   After deletion, the homepage falls back to its default content.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and confirms the user has the ADMIN role in the database.
// Returns the admin's userId (truthy) if they are authorized, or null (falsy) if not.
// Returning the userId (rather than just true) lets us pass it to child operations if needed.
// "async" is required because we must "await" cookies() and the Prisma query.
async function requireAdmin() {
  // Read all cookies from the incoming request
  const c = await cookies();

  // Get the userId cookie value and convert it to a number; default to 0 if absent.
  // ?? 0 replaces undefined/null with 0.
  const userId = Number(c.get('userId')?.value ?? 0);

  // If userId is 0, no cookie was present — the user is not logged in; return null (falsy)
  if (!userId) return null;

  // Look up the user's role in the database; only fetch the role column
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // If the user is ADMIN, return their userId (truthy); otherwise return null (falsy)
  return user?.role === 'ADMIN' ? userId : null;
}

// ── POST /api/admin/story-of-week ────────────────────────────────────────────

// Pins a story as the Story of the Week by saving its ID to the SiteSetting table.
// Validates that the story exists and is PUBLISHED before pinning it.
//
// "req: Request" — the incoming HTTP request; we read its JSON body for { storyId }
export async function POST(req: Request) {
  // Block non-admins — return 403 Forbidden before doing anything else.
  // requireAdmin() returns null for non-admins, which is falsy — so !(null) is true.
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse the JSON body of the request.
  // We expect { storyId: 123 } where 123 is the numeric ID of the story to pin.
  const { storyId } = await req.json();

  // ── Validate storyId ──────────────────────────────────────────────────────────

  // storyId must be present and must be a number.
  // !storyId catches null, undefined, 0, and empty string.
  // typeof storyId !== 'number' rejects strings like "123" to ensure type safety.
  if (!storyId || typeof storyId !== 'number') {
    return NextResponse.json({ error: 'Invalid storyId' }, { status: 400 });
  }

  // ── Verify the story exists and is published ──────────────────────────────────

  // Look up the story by its primary key ID.
  // select: { id: true, status: true } fetches only what we need for validation.
  // findUnique() returns the story object or null if no story has that ID.
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, status: true },
  });

  // If the story doesn't exist, or it isn't PUBLISHED (e.g. it's a DRAFT),
  // return 404 Not Found — we don't want to feature unpublished content.
  if (!story || story.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Story not found or not published' }, { status: 404 });
  }

  // ── Save the pin to the database ──────────────────────────────────────────────

  // upsert = "update if the row exists, create it if it doesn't".
  // where: { key: 'story_of_week_id' } looks for an existing SiteSetting row with that key.
  // create: inserts a new row if none exists.
  // update: sets the value if the row already exists (replaces the previous pin).
  // String(storyId) converts the number 123 to the string "123" for the value column.
  await prisma.siteSetting.upsert({
    where: { key: 'story_of_week_id' },
    create: { key: 'story_of_week_id', value: String(storyId) },
    update: { value: String(storyId) },
  });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/admin/story-of-week ──────────────────────────────────────────

// Clears the Story of the Week pin by removing the "story_of_week_id" row from SiteSetting.
// After this, the homepage will no longer show a pinned story.
// No request body is needed — just the DELETE method on this URL.
export async function DELETE() {
  // Block non-admins — return 403 Forbidden before doing anything else
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // deleteMany removes all SiteSetting rows where key matches "story_of_week_id".
  // We use deleteMany (not delete) because it doesn't throw if no row exists —
  // deleting a pin that was already cleared is a safe no-op.
  await prisma.siteSetting.deleteMany({ where: { key: 'story_of_week_id' } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
