// app/api/draft/[token]/route.ts
// GET — validates a draft share token and returns the story content.
// Used by the public draft preview page at /draft/[token].
// Does NOT require authentication — the token IS the authorization.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notFound, serverError } from '@/lib/apiError';

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;

  try {
    // Look up the token record
    const shareToken = await prisma.draftShareToken.findUnique({
      where: { token },
      include: {
        // Load the story with its author info
        user: { select: { username: true, profile: { select: { avatar: true } } } },
      },
    });

    if (!shareToken) return notFound();

    // Check if the token has expired
    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This share link has expired.' }, { status: 410 });
    }

    // Load the actual story content
    const story = await prisma.story.findUnique({
      where: { id: shareToken.storyId },
      select: {
        id: true,
        title: true,
        content: true,
        coverImage: true,
        mood: true,
        createdAt: true,
        author: { select: { username: true, profile: { select: { avatar: true } } } },
        // Include tag names for the preview page badges
        tags: { select: { name: true } },
      },
    });

    if (!story) return notFound();

    return NextResponse.json({
      story,
      // Include when the token expires so the preview page can show it
      expiresAt: shareToken.expiresAt,
    });
  } catch (err) {
    console.error('[draft token GET]', err);
    return serverError();
  }
}
