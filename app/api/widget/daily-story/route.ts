// app/api/widget/daily-story/route.ts
// GET — returns today's featured story for the home screen widget.
// Designed to be called by the PWA's periodic background sync and
// the iOS/Android widget (via a WebView or Shortcuts widget).
// Returns lightweight JSON — no heavy includes.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/apiError';

export async function GET() {
  try {
    // Pick a deterministic "story of the day" based on the current date.
    // We count all published stories and use the day-of-year as an offset,
    // so the same story appears all day but changes each day automatically.
    const now        = new Date();
    const dayOfYear  = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
    );

    const total = await prisma.story.count({ where: { status: 'PUBLISHED' } });
    if (!total) return NextResponse.json({ story: null });

    // Skip to a different story each day using modulo so we always have a valid index
    const story = await prisma.story.findFirst({
      where:   { status: 'PUBLISHED', contentRating: 'ALL' }, // only safe-for-all in widget
      orderBy: { createdAt: 'asc' },
      skip:    dayOfYear % total,
      select: {
        id:         true,
        title:      true,
        slug:       true,
        excerpt:    true,
        coverImage: true,
        mood:       true,
        views:      true,
        author:     { select: { username: true } },
        _count:     { select: { likes: true } },
      },
    });

    // Cache for 1 hour so the widget doesn't hammer the server
    return NextResponse.json(
      { story },
      { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } }
    );
  } catch (err) {
    console.error('[widget daily-story]', err);
    return serverError();
  }
}
