// app/api/sprints/[id]/join/route.ts
// POST — join a sprint (creates participant record)
// PATCH — update word count during a sprint

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unauthorized, notFound, badRequest, serverError } from '@/lib/apiError';

type Ctx = { params: Promise<{ id: string }> };

// POST — join a sprint (idempotent — safe to call multiple times)
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sprintId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const sprint = await prisma.writingSprint.findUnique({ where: { id: sprintId } });
    if (!sprint) return notFound();

    // Sprint must still be active
    if (!sprint.isActive || sprint.endsAt < new Date()) {
      return badRequest('This sprint has ended.');
    }

    // upsert: create participant record if it doesn't exist yet
    const participant = await prisma.sprintParticipant.upsert({
      where: { sprintId_userId: { sprintId, userId } },
      create: { sprintId, userId, wordCount: 0 },
      update: {}, // don't overwrite existing word count
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (err) {
    console.error('[sprint join]', err);
    return serverError();
  }
}

// Validation for word count update
const UpdateSchema = z.object({
  wordCount: z.number().int().min(0).max(1_000_000),
});

// PATCH — update word count (participant only)
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const sprintId = Number(id);

  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const sprint = await prisma.writingSprint.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.endsAt < new Date()) {
      return badRequest('Sprint not found or already ended.');
    }

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid word count.');

    // Update the participant's word count
    const participant = await prisma.sprintParticipant.update({
      where: { sprintId_userId: { sprintId, userId } },
      data: { wordCount: parsed.data.wordCount },
    });

    return NextResponse.json(participant);
  } catch (err) {
    console.error('[sprint word count update]', err);
    return serverError();
  }
}
