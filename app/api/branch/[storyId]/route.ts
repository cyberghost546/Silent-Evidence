// app/api/branch/[storyId]/route.ts
// Returns all BranchNodes for a story so the client can render the full
// choose-your-own-horror decision tree without round-tripping per choice.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ storyId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { storyId } = await params;
  const id = Number(storyId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid story ID.' }, { status: 400 });
  }

  const nodes = await prisma.branchNode.findMany({
    where: { storyId: id },
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

  return NextResponse.json(nodes);
}
