// app/api/stories/[id]/tip-goal/route.ts
// GET  — returns the tip goal and current total tips for a story.
// PATCH — sets/updates the tip goal (author only).
// DELETE — removes the tip goal.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unauthorized, forbidden, notFound, zodError, serverError } from '@/lib/apiError';

type Ctx = { params: Promise<{ id: string }> };

// GET — public, returns goal + total tips received for this story's author
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const storyId = Number(id);

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        tipGoalAmount: true,
        tipGoalTitle: true,
        tipGoalDescription: true,
        authorId: true,
      },
    });

    if (!story) return notFound();

    // Sum all tips ever received by this author (not per-story — tip goals are author-level)
    const totalTips = await prisma.tip.aggregate({
      where: { toUserId: story.authorId },
      _sum: { amount: true },
    });

    return NextResponse.json({
      goalAmount: story.tipGoalAmount,
      goalTitle: story.tipGoalTitle,
      goalDescription: story.tipGoalDescription,
      totalTipsCents: totalTips._sum.amount ?? 0,
    });
  } catch (err) {
    console.error('[tip-goal GET]', err);
    return serverError();
  }
}

// Zod schema for setting a tip goal
const TipGoalSchema = z.object({
  goalAmount: z.number().int().min(100, 'Minimum goal is $1.00').max(1000000),
  goalTitle: z.string().min(1).max(100),
  goalDescription: z.string().max(500).optional(),
});

// PATCH — set or update the tip goal (author only)
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const storyId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    // Verify the requester owns this story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
    if (!story) return notFound();
    if (story.authorId !== userId) return forbidden();

    const body = await req.json();
    const parsed = TipGoalSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const { goalAmount, goalTitle, goalDescription } = parsed.data;

    await prisma.story.update({
      where: { id: storyId },
      data: {
        tipGoalAmount: goalAmount,
        tipGoalTitle: goalTitle,
        tipGoalDescription: goalDescription ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[tip-goal PATCH]', err);
    return serverError();
  }
}

// DELETE — remove the tip goal from this story
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const storyId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
    if (!story) return notFound();
    if (story.authorId !== userId) return forbidden();

    await prisma.story.update({
      where: { id: storyId },
      data: { tipGoalAmount: null, tipGoalTitle: null, tipGoalDescription: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[tip-goal DELETE]', err);
    return serverError();
  }
}
