// app/api/stories/[id]/milestones/route.ts
// GET — returns which milestones a story has crossed.
// Called client-side on the story page for the author only.
// Milestones: 100 views, 1k views, 10k views, first like, first comment.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

const VIEW_MILESTONES = [100, 500, 1_000, 5_000, 10_000, 50_000];

export async function GET(_req: NextRequest, { params }: Params) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const storyId = Number(id);

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: {
      authorId: true,
      views: true,
      createdAt: true,
      _count: { select: { likes: true, comments: true } },
    },
  });
  if (!story || story.authorId !== userId) {
    return NextResponse.json({ milestones: [] });
  }

  // `kind` is a semantic key the client maps to an icon; the API stays free of
  // any presentation concern.
  const milestones: { kind: 'views' | 'likes' | 'comments'; label: string }[] = [];

  // View milestones
  for (const threshold of VIEW_MILESTONES) {
    if (story.views >= threshold) {
      milestones.push({
        kind: 'views',
        label: `${threshold.toLocaleString()} views`,
      });
    }
  }

  // First like
  if (story._count.likes >= 1) milestones.push({ kind: 'likes', label: 'First like!' });
  if (story._count.likes >= 10) milestones.push({ kind: 'likes', label: '10 likes' });
  if (story._count.likes >= 50) milestones.push({ kind: 'likes', label: '50 likes' });
  if (story._count.likes >= 100) milestones.push({ kind: 'likes', label: '100 likes' });

  // First comment
  if (story._count.comments >= 1) milestones.push({ kind: 'comments', label: 'First comment!' });
  if (story._count.comments >= 10) milestones.push({ kind: 'comments', label: '10 comments' });
  if (story._count.comments >= 50) milestones.push({ kind: 'comments', label: '50 comments' });

  return NextResponse.json({ milestones });
}
