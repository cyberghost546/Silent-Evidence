// app/api/stories/[id]/recommendations/route.ts
// Returns up to 8 stories similar to the given story.
//
// Scoring (each candidate story):
//   +4  same category
//   +3  per shared tag
//   +2  same mood
//   +1  same author (different story)
//   +1  published within the last 7 days (freshness)
//
// The source story and unpublished stories are excluded.
// Returns top 8 by score.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/apiError';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const storyId = Number(id);
    if (!storyId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    // Load the source story to extract its signals
    const source = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        categoryId: true,
        mood: true,
        authorId: true,
        tags: { select: { id: true } },
      },
    });

    if (!source) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    const tagIds = source.tags.map((t) => t.id);

    // Fetch candidate stories: same category OR same mood OR shared tags OR same author
    const candidates = await prisma.story.findMany({
      where: {
        id: { not: storyId },
        status: 'PUBLISHED',
        OR: [
          { categoryId: source.categoryId },
          ...(source.mood ? [{ mood: source.mood }] : []),
          ...(tagIds.length > 0 ? [{ tags: { some: { id: { in: tagIds } } } }] : []),
          { authorId: source.authorId },
        ],
      },
      include: {
        author: {
          select: {
            username: true,
            isVerified: true,
            profile: { select: { avatar: true } },
          },
        },
        category: { select: { name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
      },
      take: 100,
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const scored = candidates.map((story) => {
      let score = 0;

      if (story.categoryId === source.categoryId) score += 4;
      if (source.mood && story.mood === source.mood) score += 2;
      if (story.authorId === source.authorId) score += 1;
      if (story.createdAt >= sevenDaysAgo) score += 1;

      // Shared tags
      const sharedTags = story.tags.filter((t) => tagIds.includes(t.id)).length;
      score += sharedTags * 3;

      const { tags, ...rest } = story;
      return {
        ...rest,
        tags: tags.map(({ id: _id, ...t }) => t), // strip internal id
        similarityScore: score,
      };
    });

    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return NextResponse.json(scored.slice(0, 8));
  } catch (err) {
    console.error('[GET /api/stories/[id]/recommendations]', err);
    return serverError();
  }
}
