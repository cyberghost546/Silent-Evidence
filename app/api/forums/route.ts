// ============================================================
//  app/api/forums/route.ts
//
//  GET /api/forums
//
//  Returns the list of all forum boards for the forums index page.
//  This is a public, read-only endpoint — no authentication needed.
//  Anyone can see the forum list, even without logging in.
//
//  Each forum object in the response includes:
//    - All basic fields (id, name, slug, description, etc.)
//    - _count.posts  — total number of posts in the forum, shown
//                       as "243 posts" on the forum card
//    - posts[0]      — the single most recent post with the author's
//                       username, used to show "Last active by username"
//
//  Forums are ordered by their `order` field so an admin can control
//  which forum appears at the top by setting that number in the DB,
//  rather than relying on alphabetical or creation-date sorting.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── GET handler ───────────────────────────────────────────────────────────────
// This function is called when someone requests GET /api/forums.
// No parameters are needed — there is no session check, no query params.
export async function GET() {

  // Fetch all forum boards from the database
  const forums = await prisma.forum.findMany({
    // Order by the admin-controlled `order` column ascending (1, 2, 3 …)
    // so the most important forums appear at the top of the list
    orderBy: { order: 'asc' },

    // Include extra data alongside each forum row
    include: {

      // Count total posts in this forum.
      // Using _count is much more efficient than fetching all posts and counting in JS —
      // the database counts in a single aggregate operation.
      _count: { select: { posts: true } },

      // Fetch only the SINGLE most recent post.
      // take: 1 limits the result to one row; orderBy: createdAt desc puts newest first.
      // This is used to display "Last post by username" on the forum listing card.
      posts: {
        // Newest post first so posts[0] is the most recent
        orderBy: { createdAt: 'desc' },
        // We only want one post — stop after the first
        take: 1,
        // Include the author's username so we can show who posted last
        include: { author: { select: { username: true } } },
      },
    },
  });

  // Return the array of forums as a JSON response
  return NextResponse.json(forums);
}
