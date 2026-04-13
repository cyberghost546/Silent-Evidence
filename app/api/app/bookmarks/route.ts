// app/api/app/bookmarks/route.ts
// Mobile API — returns the logged-in user's bookmarked stories.
// Used by the Bookmarks tab in the Expo app.
// Auth is via x-user-id header (set by the mobile app's apiFetch helper).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // Read the user ID from the mobile auth header
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Fetch all bookmarks with the story details the mobile card UI needs
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      story: {
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          createdAt: true,
          author: {
            select: {
              username: true,
              profile: { select: { avatar: true } },
            },
          },
          category: { select: { name: true } },
        },
      },
    },
  });

  // Flatten so the response is an array of stories (not bookmarks wrapping stories)
  const stories = bookmarks.map((b) => b.story);

  return NextResponse.json(stories);
}
