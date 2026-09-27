// ============================================================
//  app/api/lists/[id]/items/route.ts
//
//  Manages individual stories (items) inside a story list.
//  The list is identified by the [id] dynamic segment in the URL.
//
//  POST   /api/lists/:id/items  — add a story to the list
//  DELETE /api/lists/:id/items  — remove a story from the list
//
//  Both operations require the caller to own the list.
//  A story is always appended at the end of the list (highest order value + 1).
//  Trying to add the same story twice returns a 409 Conflict error.
// ============================================================

// Import NextRequest (typed request) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB operations
import { prisma } from '@/lib/prisma';

// Type for the dynamic route params.
// The [id] folder name becomes the `id` field inside params.
// params is a Promise in Next.js App Router — must be awaited before reading.
type Props = { params: Promise<{ id: string }> };

// ── Helper: read the logged-in user's ID from the session cookie ──────────────
// Returns the numeric userId, or null if the user is not logged in.
async function getUserId() {
  // Await the cookie store (required in Next.js server context)
  const c = await cookies();
  // Read userId, convert to number, return null instead of 0 for unauthenticated users
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── POST /api/lists/:id/items ─────────────────────────────────────────────────
// Adds a story to the specified list.
// The story is appended at the end (order = current max + 1).
// Expected JSON body: { storyId: number }
export async function POST(req: NextRequest, { params }: Props) {
  // Verify the caller is logged in
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Await the params Promise and read the list ID from the URL
  const { id } = await params;

  // Convert the string id from the URL into a number for Prisma
  const listId = Number(id);

  // Parse the JSON body to get the story to add
  const { storyId } = await req.json();

  // Look up the list to verify it exists and belongs to the caller.
  // We need the userId on the list to confirm ownership.
  const list = await prisma.storyList.findUnique({ where: { id: listId } });

  // If no list was found, or the list belongs to someone else, reject with 403 Forbidden.
  // !list handles not found; list.userId !== userId handles ownership check.
  if (!list || list.userId !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Find the story currently at the END of the list (highest order number).
  // This tells us what order number to assign to the new story.
  const maxItem = await prisma.storyListItem.findFirst({
    where: { listId },
    // Sort descending so the first result is the item with the highest order number
    orderBy: { order: 'desc' },
  });

  // The new item's order = the current max order + 1.
  // If no items exist yet, maxItem is null, so (null?.order ?? 0) + 1 = 1.
  const order = (maxItem?.order ?? 0) + 1;

  try {
    // Insert the new list item into the database.
    // If the story is already in the list, the unique constraint will throw an error,
    // which is caught below and returned as a 409 Conflict.
    await prisma.storyListItem.create({ data: { listId, storyId, order } });

    // Also update the list's updatedAt timestamp so it floats to the top of the GET list
    await prisma.storyList.update({ where: { id: listId }, data: { updatedAt: new Date() } });
  } catch {
    // If Prisma throws (e.g. unique constraint violation), it means the story is already in the list
    return NextResponse.json({ error: 'Story already in list' }, { status: 409 });
  }

  // Return a simple success response
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/lists/:id/items ───────────────────────────────────────────────
// Removes a story from the specified list.
// Expected JSON body: { storyId: number }
export async function DELETE(req: NextRequest, { params }: Props) {
  // Verify the caller is logged in
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Await the params Promise and read the list ID from the URL
  const { id } = await params;

  // Convert the string id from the URL into a number for Prisma
  const listId = Number(id);

  // Parse the JSON body to get which story to remove
  const { storyId } = await req.json();

  // Look up the list to verify it exists and belongs to the caller
  const list = await prisma.storyList.findUnique({ where: { id: listId } });

  // Reject if the list doesn't exist or the caller doesn't own it
  if (!list || list.userId !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Delete all item rows matching both the listId and storyId.
  // deleteMany is used because there's no single unique primary key being targeted here;
  // we're matching on the combination of two fields.
  await prisma.storyListItem.deleteMany({ where: { listId, storyId } });

  // Return a simple success response
  return NextResponse.json({ ok: true });
}
