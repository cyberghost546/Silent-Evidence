// ============================================================
//  app/api/groups/[slug]/posts/route.ts
//
//  GET  /api/groups/:slug/posts  — paginated feed of posts for a group
//  POST /api/groups/:slug/posts  — create a new post in the group
//
//  GET supports cursor-based pagination:
//    ?cursor=<postId>  — return the next page of posts after this ID
//    (no cursor)       — return the first page (20 most recent posts)
//
//  Only group MEMBERS may create posts.  Anyone can read posts
//  (GET is public so non-members can preview the group activity).
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to check session state for POST requests
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Type for the dynamic route params — slug identifies the group
type Params = { params: Promise<{ slug: string }> };

// ── GET handler: paginated post feed ─────────────────────────────────────────
// Returns up to 20 posts for the group, newest first.
// Supports cursor-based pagination for infinite scroll.
export async function GET(req: Request, { params }: Params) {
  // Read the group slug from the URL
  const { slug } = await params;

  // Parse the URL to read optional query parameters
  const { searchParams } = new URL(req.url);

  // Read the cursor query param — if provided, it's the ID of the last post we saw.
  // The next page will start AFTER this post.
  // If not provided, undefined tells Prisma to start from the beginning.
  const cursor = searchParams.get('cursor') ? Number(searchParams.get('cursor')) : undefined;

  // Look up the group — we only need its numeric id for the posts query below
  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  // Return 404 if no group with this slug exists
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });

  // Fetch up to 20 posts for this group
  const posts = await prisma.groupPost.findMany({
    where: {
      // Only posts that belong to this group
      groupId: group.id,
    },
    // Newest posts first (standard social feed order)
    orderBy: { createdAt: 'desc' },
    // Maximum 20 posts per page
    take: 20,
    // Cursor pagination: if a cursor was provided, skip 1 row (the cursor row itself)
    // and start fetching from the row AFTER it.
    // The spread means this entire block is omitted if cursor is undefined.
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      // Include the post author's details for the post card header
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { avatar: true } },
        },
      },
    },
  });

  // Return the array of posts (may be empty if this group has no posts yet)
  return NextResponse.json(posts);
}

// ── POST handler: create a new group post ────────────────────────────────────
// Creates a new text post in the group.
// Only members of the group are allowed to post.
export async function POST(req: Request, { params }: Params) {
  // Read the group slug from the URL
  const { slug } = await params;

  // Check who is logged in
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to post
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Look up the group — we need its id to check membership and create the post
  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  // Return 404 if the group doesn't exist
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });

  // Check whether the caller is a member of this group.
  // Only members may post — lurkers and non-members cannot.
  const membership = await prisma.groupMember.findUnique({
    where: {
      // The composite unique key (groupId + userId)
      groupId_userId: { groupId: group.id, userId },
    },
  });

  // If no membership row exists, the user is not a member — reject
  if (!membership) {
    return NextResponse.json({ error: 'You must join this group to post.' }, { status: 403 });
  }

  // Parse the JSON body to get the post content
  const { content } = await req.json();

  // Content must be a non-empty string
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
  }

  // Create the group post in the database
  const post = await prisma.groupPost.create({
    data: {
      // Link to the group
      groupId: group.id,
      // Record the author
      authorId: userId,
      // Trimmed post text
      content: content.trim(),
    },
    // Include author details so the newly created post can be rendered immediately
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { avatar: true } },
        },
      },
    },
  });

  // Return 201 Created with the new post object
  return NextResponse.json(post, { status: 201 });
}
