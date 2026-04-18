// app/api/branch/by-slug/[slug]/route.ts
// Returns story meta + all BranchNodes for a story looked up by slug.
// Used by the client-side branch reader so it only needs one fetch.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

  const story = await prisma.story.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      author: { select: { username: true } },
    },
  });

  if (!story) {
    return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  }

  const nodes = await prisma.branchNode.findMany({
    where: { storyId: story.id },
    select: {
      id: true,
      content: true,
      choiceLabel: true,
      isEnding: true,
      order: true,
      parentId: true,
    },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ story, nodes });
}
