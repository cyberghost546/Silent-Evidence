// app/api/stories/[id]/planner/route.ts
// GET  — returns the current planner content for a story (or empty array if none)
// POST — upserts the planner content (only the story author may save)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isFinite(storyId) || storyId <= 0) {
    return NextResponse.json({ error: 'Invalid story ID.' }, { status: 400 });
  }

  const planner = await prisma.storyPlanner.findUnique({ where: { storyId } });
  return NextResponse.json({ content: planner?.content ?? '[]' });
}

export async function POST(req: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isFinite(storyId) || storyId <= 0) {
    return NextResponse.json({ error: 'Invalid story ID.' }, { status: 400 });
  }

  // Verify the requester owns this story
  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true } });
  if (!story || story.authorId !== userId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const { content } = await req.json();
  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'Content must be a JSON string.' }, { status: 400 });
  }

  await prisma.storyPlanner.upsert({
    where:  { storyId },
    create: { storyId, content },
    update: { content },
  });

  return NextResponse.json({ ok: true });
}
