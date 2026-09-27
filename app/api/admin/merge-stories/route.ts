// app/api/admin/merge-stories/route.ts
// POST — merges sourceId into targetId:
//   • Moves all likes, comments, bookmarks, reactions from source → target
//   • Adds source's views to target's views
//   • Deletes the source story

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { sourceId, targetId } = await req.json();
  if (!sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ error: 'Invalid source or target story IDs.' }, { status: 400 });
  }

  const [source, target] = await Promise.all([
    prisma.story.findUnique({
      where: { id: sourceId },
      select: { id: true, title: true, views: true },
    }),
    prisma.story.findUnique({ where: { id: targetId }, select: { id: true, title: true } }),
  ]);
  if (!source || !target) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });

  // Run all migrations in a transaction
  await prisma.$transaction(async (tx) => {
    // Move likes — skip duplicates (user already liked target)
    const existingLikes = await tx.like.findMany({
      where: { storyId: targetId },
      select: { userId: true },
    });
    const existingLikeUsers = new Set(existingLikes.map((l) => l.userId));
    const sourceLikes = await tx.like.findMany({
      where: { storyId: sourceId },
      select: { userId: true },
    });
    for (const like of sourceLikes) {
      if (!existingLikeUsers.has(like.userId)) {
        await tx.like.create({ data: { userId: like.userId, storyId: targetId } });
      }
    }
    await tx.like.deleteMany({ where: { storyId: sourceId } });

    // Move comments
    await tx.comment.updateMany({ where: { storyId: sourceId }, data: { storyId: targetId } });

    // Move bookmarks — skip duplicates
    const existingBM = await tx.bookmark.findMany({
      where: { storyId: targetId },
      select: { userId: true },
    });
    const existingBMUsers = new Set(existingBM.map((b) => b.userId));
    const sourceBM = await tx.bookmark.findMany({
      where: { storyId: sourceId },
      select: { userId: true },
    });
    for (const bm of sourceBM) {
      if (!existingBMUsers.has(bm.userId)) {
        await tx.bookmark.create({ data: { userId: bm.userId, storyId: targetId } });
      }
    }
    await tx.bookmark.deleteMany({ where: { storyId: sourceId } });

    // Move reactions — skip duplicates
    const existingReactions = await tx.reaction.findMany({
      where: { storyId: targetId },
      select: { userId: true, type: true },
    });
    const existingRSet = new Set(existingReactions.map((r) => `${r.userId}:${r.type}`));
    const sourceReactions = await tx.reaction.findMany({ where: { storyId: sourceId } });
    for (const r of sourceReactions) {
      if (!existingRSet.has(`${r.userId}:${r.type}`)) {
        await tx.reaction.create({ data: { userId: r.userId, storyId: targetId, type: r.type } });
      }
    }
    await tx.reaction.deleteMany({ where: { storyId: sourceId } });

    // Add source views to target
    await tx.story.update({
      where: { id: targetId },
      data: { views: { increment: source.views } },
    });

    // Delete the source story
    await tx.story.delete({ where: { id: sourceId } });
  });

  return NextResponse.json({ ok: true, merged: source.title, into: target.title });
}
