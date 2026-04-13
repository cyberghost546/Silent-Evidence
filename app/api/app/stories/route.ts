// app/api/app/stories/route.ts
// GET — returns the 20 most recently published stories rated ALL (safe for all users).
// No authentication is required — this is the public home-feed for the mobile app.
// Each story includes the category, author, avatar, and engagement counts.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  // Fetch the 20 latest PUBLISHED stories with contentRating=ALL.
  // ALL-rated content is safe for every age group, so no auth check is needed.
  const stories = await prisma.story.findMany({
    where: {
      status: 'PUBLISHED',         // Only fully published stories
      contentRating: 'ALL',        // Safe for all users — no age-gate required
    },
    orderBy: { createdAt: 'desc' }, // Newest first
    take: 20,                       // Limit to 20 stories per request
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      views: true,
      mood: true,
      createdAt: true,

      // Category name and slug for the badge on each card
      category: {
        select: { name: true, slug: true },
      },

      // Author username and avatar for the author row on each card
      author: {
        select: {
          username: true,
          profile: { select: { avatar: true } },
        },
      },

      // Like and comment counts for the meta row
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  // Return the list wrapped in an object — consistent with other app API routes
  return NextResponse.json({ stories });
}
