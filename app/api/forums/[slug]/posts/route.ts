// ============================================================
//  app/api/forums/[slug]/posts/route.ts
//
//  Handles posts within a specific forum board.  The board is
//  identified by its URL-friendly `slug` (e.g. "general-horror").
//
//  GET  /api/forums/:slug/posts
//    → Returns the forum and all its posts (public — no login needed).
//      Pinned posts always appear first, then newest posts after that.
//
//  POST /api/forums/:slug/posts
//    → Creates a new discussion thread in this forum.
//      Requires the user to be logged in.
//      Title must be ≤ 200 characters and both title/content are required.
// ============================================================

// Import NextRequest (typed request) and NextResponse for JSON replies
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies helper so we can check session state for POST requests
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Type alias for the dynamic route params.
// The [slug] folder becomes the `slug` field inside params.
// params is a Promise in Next.js App Router — must be awaited.
type Props = { params: Promise<{ slug: string }> };

// ── Helper: read the logged-in user's ID from the session cookie ──────────
// Returns the numeric userId, or null if not logged in.
async function getUserId() {
  // Read all cookies from the incoming request
  const c = await cookies();
  // Return the userId as a number, or null if the cookie is missing / zero
  return Number(c.get('userId')?.value ?? 0) || null;
}

// ── GET handler ───────────────────────────────────────────────────────────────
// Returns the full forum object plus all its posts.
// This is a public endpoint — anyone can read the forum without logging in.
// _req is prefixed with _ to signal that we intentionally don't use the request object here
export async function GET(_req: NextRequest, { params }: Props) {

  // Await the params object to read the slug segment
  const { slug } = await params;

  // Look up the forum in the database by its unique slug
  const forum = await prisma.forum.findUnique({
    where: { slug },
    include: {
      // Fetch all posts in this forum along with author and reply count
      posts: {
        // Two-level sort:
        //   1. pinned: desc  — pinned posts (pinned=true) come before non-pinned (pinned=false)
        //      because true > false numerically (1 > 0), so desc puts them first
        //   2. createdAt: desc — among non-pinned posts, show newest first
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          // Include author's username and avatar for display in the post list
          author: {
            select: {
              username: true,
              // Avatar lives in the related Profile row
              profile: { select: { avatar: true } },
            },
          },
          // Count how many replies each post has received.
          // Shown as "14 replies" on the post card without fetching all replies.
          _count: { select: { replies: true } },
        },
      },
    },
  });

  // If no forum exists with this slug, return a 404 error
  if (!forum) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Return the forum object with all its posts
  return NextResponse.json(forum);
}

// ── POST handler ──────────────────────────────────────────────────────────────
// Creates a new discussion post (thread) in this forum.
// Only logged-in users may create posts.
export async function POST(req: NextRequest, { params }: Props) {

  // Must be logged in to create a post
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Read the forum slug from the URL
  const { slug } = await params;

  // Verify the forum exists before trying to post in it.
  // If someone sends a POST to a non-existent slug we return 404.
  const forum = await prisma.forum.findUnique({ where: { slug } });
  if (!forum) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Parse the JSON body to get the post title and content
  const { title, content } = await req.json();

  // Validate: both title and content are required and must not be blank
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
  }

  // Validate: enforce a reasonable title length cap
  if (title.length > 200) {
    return NextResponse.json({ error: 'Title too long' }, { status: 400 });
  }

  // Create the forum post in the database
  const post = await prisma.forumPost.create({
    data: {
      // Remove surrounding whitespace from both fields
      title: title.trim(),
      content: content.trim(),
      // Link to the forum board this post belongs to
      forumId: forum.id,
      // Record the author
      authorId: userId,
    },
    // Include the author's username so the UI can show it immediately after creation
    include: { author: { select: { username: true } } },
  });

  // Return the created post with HTTP 201 Created
  return NextResponse.json(post, { status: 201 });
}
