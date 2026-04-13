// app/api/user/pinned-story/route.ts
// POST — set the logged-in user's pinned story
// DELETE — unpin (clear pinnedStoryId)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Helper: resolve the logged-in user from cookie
async function getUser() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  return userId || null;
}

// POST /api/user/pinned-story — body: { storyId: number }
export async function POST(req: NextRequest) {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { storyId } = await req.json();
  if (!storyId) return NextResponse.json({ error: 'storyId required' }, { status: 400 });

  // Make sure the story belongs to this user before pinning it
  const story = await prisma.story.findUnique({
    where: { id: Number(storyId) },
    select: { authorId: true, status: true },
  });
  if (!story || story.authorId !== userId) {
    return NextResponse.json({ error: 'Story not found or not yours' }, { status: 403 });
  }

  // Update the pinnedStoryId field on the user record
  await prisma.user.update({ where: { id: userId }, data: { pinnedStoryId: Number(storyId) } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/user/pinned-story — removes the pinned story
export async function DELETE() {
  const userId = await getUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.user.update({ where: { id: userId }, data: { pinnedStoryId: null } });
  return NextResponse.json({ ok: true });
}
