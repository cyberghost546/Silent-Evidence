// app/api/chapters/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles two endpoints for story chapters:
//
//   GET  /api/chapters?storyId=X — returns all chapters for a story, ordered by position.
//                                   Public — no auth needed (used by the reading page).
//   POST /api/chapters            — creates a new chapter on a story.
//                                   Restricted to the story's author.
//
// Chapters are ordered numbered sections of a serialised story (e.g. Chapter 1, 2, 3...).
// When the first chapter is created the parent story is flagged as isChaptered: true
// so the UI knows to show chapter navigation instead of a single block of text.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to query stories and manage chapter records
import { prisma } from '@/lib/prisma';

// ── GET /api/chapters?storyId=X ───────────────────────────────────────────────
// Returns all chapters for the given story, ordered by their position number (order asc).
// This endpoint is public — the reading page loads it without requiring a login.
// "req" is a standard Web API Request; we read the URL's query parameters from it.
export async function GET(req: Request) {
  // Parse the request URL into a URL object so we can access searchParams
  const { searchParams } = new URL(req.url);

  // Extract the storyId query parameter and convert it to an integer.
  // If the param is missing, Number(null) returns 0 which is falsy.
  const storyId = Number(searchParams.get('storyId'));

  // storyId is required — we can't return chapters without knowing which story
  if (!storyId) return NextResponse.json({ error: 'storyId required' }, { status: 400 });

  // Fetch all chapters that belong to this story, sorted by their position number.
  // orderBy: { order: 'asc' } means chapter 1 comes first, then 2, 3, etc.
  // select: only return the fields that the ChapterManager UI needs —
  //         returning full chapter content here would waste bandwidth since we
  //         only need the list view, not the full text of every chapter.
  const chapters = await prisma.storyChapter.findMany({
    where: { storyId },              // only chapters belonging to this story
    orderBy: { order: 'asc' },       // ascending position order (1, 2, 3...)

    // Include views so ChapterManager can show per-chapter read stats
    select: {
      id: true,        // chapter's unique database ID
      title: true,     // chapter's display title (e.g. "Chapter 1: The Beginning")
      order: true,     // the chapter's position number in the story
      views: true,     // how many times this chapter has been opened
      createdAt: true, // when this chapter was published
    },
  });

  // Return the array of chapter summaries as JSON
  return NextResponse.json(chapters);
}

// ── POST /api/chapters — body: { storyId, title, content } ───────────────────
// Creates a new chapter on a story. Only the story's author is allowed to do this.
// The new chapter is automatically placed after the last existing chapter.
// "req" is a standard Web API Request with the chapter data in its JSON body.
export async function POST(req: Request) {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Read the session cookie to identify which user is making the request
  const cookieStore = await cookies();

  // Extract the userId from the cookie, defaulting to 0 if it isn't present.
  // Number() converts the string cookie value to an integer.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If userId is 0 (falsy), the user is not logged in — reject the request
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Parse the request body ────────────────────────────────────────────────
  // Read the JSON body from the request (expects { storyId, title, content })
  const body = await req.json();

  // Convert the storyId to an integer — it may arrive as a string from some clients
  const storyId = Number(body.storyId);

  // Safely extract the title string and trim whitespace; default to empty string if missing
  const title   = typeof body.title   === 'string' ? body.title.trim()   : '';

  // Safely extract the content string and trim whitespace; default to empty string if missing.
  // Content can be empty — some authors add the title first, then fill in the text later.
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  // Both storyId and title are required to create a chapter
  if (!storyId || !title) {
    return NextResponse.json({ error: 'storyId and title are required.' }, { status: 400 });
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  // Only the story author may add chapters — look up the story's authorId
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { authorId: true }, // only fetch authorId — we don't need anything else
  });

  // If the story doesn't exist, there's nothing to add a chapter to
  if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });

  // If the logged-in user is not the author, block the request
  if (story.authorId !== userId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // ── Determine chapter position ────────────────────────────────────────────
  // Find the chapter with the highest order number for this story.
  // This tells us where to place the new chapter (one after the last).
  // Place the new chapter after the last existing one
  const last = await prisma.storyChapter.findFirst({
    where: { storyId },          // only look at chapters from this story
    orderBy: { order: 'desc' },  // sort descending so the highest order comes first
    select: { order: true },     // we only need the order number, nothing else
  });

  // Calculate the new chapter's position:
  // If there are no existing chapters, last is null — last?.order ?? 0 gives 0, so order = 1.
  // If the last chapter is at position 3, the new chapter will be at position 4.
  const order = (last?.order ?? 0) + 1;

  // ── Create the chapter record ─────────────────────────────────────────────
  // Insert the new chapter row into the database with all the collected data
  const chapter = await prisma.storyChapter.create({
    data: {
      storyId,   // which story this chapter belongs to
      title,     // the chapter's display title
      content,   // the chapter's full text body (may be empty if added later)
      order,     // its position in the sequence (1, 2, 3...)
    },
  });

  // ── Auto-enable chaptered mode on the parent story ────────────────────────
  // Update the parent story's isChaptered flag to true so the reading page
  // knows to render chapter navigation instead of a single continuous text block.
  // Auto-enable isChaptered on the parent story
  await prisma.story.update({
    where: { id: storyId },
    data: { isChaptered: true },
  });

  // Return 201 Created with the newly created chapter record as JSON
  return NextResponse.json(chapter, { status: 201 });
}
