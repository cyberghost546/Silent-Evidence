// app/api/chapters/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles three endpoints for a single chapter identified by [id]:
//
//   GET    /api/chapters/[id] — returns the full chapter content with parent story
//                               info. Public — used by the reading page.
//   PATCH  /api/chapters/[id] — updates the chapter's title, content, or position.
//                               Restricted to the story's author.
//   DELETE /api/chapters/[id] — permanently removes a chapter.
//                               Restricted to the story's author.
//                               If the story has no chapters left after the delete,
//                               the parent story's isChaptered flag is reset to false.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to query and modify chapter and story records
import { prisma } from '@/lib/prisma';

// Next.js App Router passes dynamic route segments (e.g. [id]) through a params Promise.
// We declare the type so TypeScript knows the shape of the resolved value.
type Ctx = { params: Promise<{ id: string }> };

// ── GET /api/chapters/[id] ────────────────────────────────────────────────────
// Returns the full chapter including its parent story's metadata.
// Used by the reading page to render the chapter text and the navigation breadcrumb.
// "_req" is prefixed with _ to signal that we don't use the request object in this handler.
export async function GET(_req: Request, { params }: Ctx) {
  // Await the params Promise to get the chapter ID string from the URL segment
  const { id } = await params;

  // Fetch the chapter from the database by its primary key.
  // include: story — also fetch selected fields from the parent story record so
  // the reading page knows the story's title, slug, and whether it's chaptered.
  const chapter = await prisma.storyChapter.findUnique({
    where: { id: Number(id) }, // Number() converts the string URL segment to an integer

    include: {
      story: {
        select: {
          slug: true,        // the URL-friendly identifier for the story (e.g. "the-dark-descent")
          title: true,       // the story's display title
          authorId: true,    // the author's user ID — used by the reading page to show edit controls
          isChaptered: true, // whether this story has multiple chapters (drives the chapter nav UI)
        },
      },
    },
  });

  // If no chapter was found with this ID, return 404 Not Found
  if (!chapter) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // Return the full chapter record (including the nested story data) as JSON
  return NextResponse.json(chapter);
}

// ── Shared author guard ───────────────────────────────────────────────────────
// This helper function is used by both PATCH and DELETE to verify that the logged-in
// user is the author of the story that the chapter belongs to.
// It returns either an error object (if access should be denied) or the chapter object.
// "chapterId" — the integer ID of the chapter to check
// "userId"    — the integer ID of the currently logged-in user
async function authorGuard(chapterId: number, userId: number) {
  // Fetch the chapter along with its parent story's authorId
  const chapter = await prisma.storyChapter.findUnique({
    where: { id: chapterId }, // find the specific chapter by its primary key

    include: {
      story: {
        select: { authorId: true }, // we only need the authorId to verify ownership
      },
    },
  });

  // If the chapter doesn't exist, signal a 404 error
  if (!chapter) return { error: 'Not found.', status: 404 };

  // If the chapter's parent story was written by someone other than the caller, signal 403
  if (chapter.story.authorId !== userId) return { error: 'Forbidden.', status: 403 };

  // All checks passed — return the chapter so the calling handler can use it
  return { chapter };
}

// ── PATCH /api/chapters/[id] — body: { title?, content?, order? } ─────────────
// Updates one or more fields on a chapter. All fields are optional — only the
// fields that are present in the body will be changed (partial update).
// "req" contains the updated field values in its JSON body.
export async function PATCH(req: Request, { params }: Ctx) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Read the session cookie to identify the requesting user
  const cookieStore = await cookies();

  // Extract the userId from the cookie; default to 0 if the cookie is missing
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0 (falsy), the user is not logged in — reject the request
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Await the params Promise to get the chapter ID string
  const { id } = await params;

  // Run the author guard to check the chapter exists and belongs to this user's story
  const guard = await authorGuard(Number(id), userId);

  // If the guard returned an error (not found or forbidden), return that error response
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  // ── Build the update payload ──────────────────────────────────────────────
  // Parse the JSON body from the request
  const body = await req.json();

  // Start with an empty object — we only add fields that were actually sent by the client.
  // Record<string, unknown> means "an object with string keys and any type of value".
  const data: Record<string, unknown> = {};

  // Only include title if it was provided and is a string (trim whitespace)
  if (typeof body.title   === 'string') data.title   = body.title.trim();

  // Only include content if it was provided and is a string (trim whitespace)
  if (typeof body.content === 'string') data.content = body.content.trim();

  // Only include order if it was provided and is a number (skip strings/undefined)
  if (typeof body.order   === 'number') data.order   = body.order;

  // ── Apply the update ──────────────────────────────────────────────────────
  // Update the chapter in the database with only the fields that were provided
  const updated = await prisma.storyChapter.update({
    where: { id: Number(id) }, // target this specific chapter by its primary key
    data,                      // the partial update object built above
  });

  // Return the updated chapter record as JSON
  return NextResponse.json(updated);
}

// ── DELETE /api/chapters/[id] ─────────────────────────────────────────────────
// Permanently deletes a chapter. If it was the last chapter on the story, the
// parent story's isChaptered flag is turned off so it reverts to single-text mode.
// "_req" is unused — we prefix with _ to avoid TypeScript unused-variable warnings.
export async function DELETE(_req: Request, { params }: Ctx) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Read the session cookie to identify the requesting user
  const cookieStore = await cookies();

  // Extract the userId from the cookie; default to 0 if the cookie is missing
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0 (falsy), the user is not logged in — reject the request
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Await the params Promise to get the chapter ID string
  const { id } = await params;

  // Convert the URL string to an integer for database queries
  const chapterId = Number(id);

  // Run the author guard to verify the chapter exists and this user owns the story
  const guard = await authorGuard(chapterId, userId);

  // If the guard returned an error (not found or forbidden), return that error response
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  // Retrieve the parent story's ID from the verified chapter record.
  // The ! (non-null assertion) is safe here because the guard already confirmed chapter exists.
  const storyId = guard.chapter!.storyId;

  // Delete the chapter from the database permanently
  await prisma.storyChapter.delete({ where: { id: chapterId } });

  // ── Cleanup: turn off isChaptered if no chapters remain ───────────────────
  // Count how many chapters still exist on this story after the deletion
  // If no chapters remain, turn off isChaptered
  const remaining = await prisma.storyChapter.count({ where: { storyId } });

  // If there are zero chapters left, reset the parent story's isChaptered flag.
  // This makes the reading page fall back to rendering the story as a single text block.
  if (remaining === 0) {
    await prisma.story.update({
      where: { id: storyId },
      data: { isChaptered: false },
    });
  }

  // Return 200 OK — the chapter was successfully deleted
  return NextResponse.json({ ok: true });
}
