// app/api/activity/route.ts
// GET — returns a paginated activity feed of events from users the current user follows.
// Events: new stories published, likes given, and comments posted by followed users.
// The three event types are merged, sorted by date, and sliced to the requested page.

// Import types and helpers for handling API requests and responses in Next.js
import { NextRequest, NextResponse } from 'next/server';

// Import function to read cookies from the request
import { cookies } from 'next/headers';

// Import your Prisma client to interact with the database
import { prisma } from '@/lib/prisma';

// Number of items returned per page for pagination
const PAGE_SIZE = 20;

// "async" lets this function use "await" inside it.
// This is needed for things like database calls, cookies, or APIs.
// The function always returns a Promise.
// Defines a GET API route handler in Next.js.
// Runs when a client sends a GET request to this endpoint.
// "req" contains request data like query params, headers, and cookies.
export async function GET(req: NextRequest) {
  // Get cookies from request
  const c = await cookies();

  // Extract userId from cookies, fallback to 0 if missing
  const userId = Number(c.get('userId')?.value ?? 0);

  // Block request if user is not logged in
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get page number from query (?page=)
  // Ensure page is at least 1
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1));

  // Get all users that the current user follows
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  // Extract only the IDs into an array
  const followingIds = follows.map((f) => f.followingId);

  // If user follows nobody, return empty feed
  if (followingIds.length === 0) {
    return NextResponse.json({ events: [], hasMore: false });
  }

  // Fetch all feed data in parallel for performance
  const [stories, likes, comments] = await Promise.all([
    // Get published stories from followed users
    prisma.story.findMany({
      where: { authorId: { in: followingIds }, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' }, // newest first
      take: 100, // limit results
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        createdAt: true,
        author: {
          select: {
            username: true,
            profile: { select: { avatar: true } },
          },
        },
      },
    }),

    // Get likes made by followed users
    prisma.like.findMany({
      where: { userId: { in: followingIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            profile: { select: { avatar: true } },
          },
        },
        story: {
          select: { title: true, slug: true },
        },
      },
    }),

    // Get top-level comments from followed users (no replies)
    prisma.comment.findMany({
      where: { userId: { in: followingIds }, parentId: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            profile: { select: { avatar: true } },
          },
        },
        story: {
          select: { title: true, slug: true },
        },
      },
    }),
  ]);

  // Define a unified event structure for frontend
  type Event =
    | { type: 'story'; date: Date; data: (typeof stories)[number] }
    | { type: 'like'; date: Date; data: (typeof likes)[number] }
    | { type: 'comment'; date: Date; data: (typeof comments)[number] };

  // Normalize all data into one array
  const events: Event[] = [
    // Map stories into event format
    ...stories.map((s) => ({
      type: 'story' as const,
      date: s.createdAt,
      data: s,
    })),

    // Map likes into event format
    ...likes.map((l) => ({
      type: 'like' as const,
      date: l.createdAt,
      data: l,
    })),

    // Map comments into event format
    ...comments.map((c) => ({
      type: 'comment' as const,
      date: c.createdAt,
      data: c,
    })),
  ]
    // Sort all events by newest first
    .sort((a, b) => b.date.getTime() - a.date.getTime())

    // Apply pagination
    // +1 item is used to check if next page exists
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE + 1);

  // If we got more than PAGE_SIZE, there is another page
  const hasMore = events.length > PAGE_SIZE;

  // Remove the extra item before sending response
  const pageEvents = events.slice(0, PAGE_SIZE);

  // Return JSON response
  return NextResponse.json({
    // Convert Date objects to strings (safe for JSON)
    events: JSON.parse(JSON.stringify(pageEvents)),
    hasMore,
  });
}
