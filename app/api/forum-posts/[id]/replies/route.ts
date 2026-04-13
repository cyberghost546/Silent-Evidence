// ============================================================
//  app/api/forum-posts/[id]/replies/route.ts
//
//  POST /api/forum-posts/:id/replies
//
//  Creates a new reply attached to the forum post identified by
//  the dynamic :id segment in the URL.
//
//  Forum posts support threaded replies.  This endpoint lets any
//  logged-in user add their reply to a specific post.
//
//  Requirements:
//    - The caller must be logged in (anonymous replies are blocked).
//    - The reply content must be a non-empty string.
//
//  On success the newly created reply is returned with the
//  author's username and avatar so the frontend can display it
//  immediately without needing a second API call to fetch it.
// ============================================================

// Import NextRequest (adds typed .nextUrl) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Type alias for the dynamic route params.
// params is a Promise in Next.js App Router — we must await it before reading id.
type Props = { params: Promise<{ id: string }> };

// ── Helper function: read userId from the session cookie ───────────────────
// Returns the numeric userId, or null if the user is not logged in.
// Defined as a separate helper so it can be reused easily if more handlers
// are added to this file in the future.
async function getUserId() {
  // Await the cookie store (required in Next.js server components/routes)
  const c = await cookies();
  // Read the 'userId' cookie, convert to number, return null instead of 0
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── POST handler ──────────────────────────────────────────────────────────────
// Creates a reply to the forum post whose ID is in the URL.
// req    — the incoming HTTP request containing the reply content in its JSON body
// params — contains the dynamic segment { id } from the URL
export async function POST(req: NextRequest, { params }: Props) {

  // Check whether the user is logged in before doing anything else
  const userId = await getUserId();

  // Anonymous users cannot post replies — return 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Await the params Promise and destructure the id segment from the URL
  const { id } = await params;

  // Convert the id string (e.g. "17") from the URL to a number for the DB query
  const postId = Number(id);

  // Parse the request body to get the reply text the user typed
  const { content } = await req.json();

  // A reply with no content (empty or only whitespace) should be rejected early
  // .trim() removes leading/trailing spaces; !content checks for null/undefined
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  // Insert the new reply into the ForumReply table
  const reply = await prisma.forumReply.create({
    data: {
      // Store the reply text with surrounding whitespace removed
      content: content.trim(),
      // Link the reply to the forum post it belongs to
      postId,
      // Record who wrote it (the logged-in user)
      authorId: userId,
    },
    // Include the author's username and avatar in the returned object.
    // This means the UI can render the new reply card immediately without
    // a separate request to fetch the author details.
    include: {
      author: {
        select: {
          username: true,
          // The avatar lives in the Profile table, related to User
          profile: { select: { avatar: true } },
        },
      },
    },
  });

  // Return the created reply with HTTP 201 Created status
  return NextResponse.json(reply, { status: 201 });
}
