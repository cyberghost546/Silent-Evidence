// app/api/app/stories/[slug]/route.ts
// GET — returns a single published story by its URL slug.
// Includes the full HTML content body, tags, warnings, scareScore, and contentRating.
// Also fires a fire-and-forget view increment so the story's view count stays accurate.
// Returns 404 JSON if the slug doesn't match any published story.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Next.js dynamic-route handler — `params.slug` comes from the [slug] folder name
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Await the params Promise (required in Next.js 15+)
  const { slug } = await params;

  // Look up the story by slug — only return it if it is currently published
  const story = await prisma.story.findFirst({
    where: {
      slug,
      status: 'PUBLISHED', // Drafts and archived stories are not accessible via the app
    },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,      // Full HTML body — injected into the WebView
      excerpt: true,
      coverImage: true,
      views: true,
      mood: true,
      warnings: true,     // Yellow warning bar shown before the content
      scareScore: true,   // 1-10 AI-generated score
      contentRating: true,
      createdAt: true,
      updatedAt: true,

      // Category for the badge shown in the story header
      category: {
        select: { name: true, slug: true },
      },

      // Tags shown below the header
      tags: {
        select: { name: true, slug: true },
      },

      // Author details — isVerified controls the verified checkmark
      author: {
        select: {
          username: true,
          isVerified: true,
          profile: { select: { avatar: true } },
        },
      },

      // Engagement counts for the stats row
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  // Return a structured 404 if the story doesn't exist or isn't published
  if (!story) {
    return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  }

  // Fire-and-forget view increment — we don't await this so the response
  // is returned immediately without waiting for the write to complete.
  // If this fails (e.g. DB hiccup) it's acceptable — the count is approximate.
  prisma.story
    .update({
      where: { id: story.id },
      data: { views: { increment: 1 } },
    })
    .catch(() => {
      // Intentionally swallowed — view count is best-effort, not critical
    });

  return NextResponse.json({ story });
}
