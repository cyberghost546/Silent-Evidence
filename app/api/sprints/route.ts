// app/api/sprints/route.ts
// GET  — returns active and upcoming writing sprints
// POST — creates a new sprint (admin only)

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unauthorized, forbidden, zodError, serverError } from '@/lib/apiError';

// GET — list active sprints (public)
export async function GET() {
  try {
    const now = new Date();

    // Return sprints that haven't ended yet
    const sprints = await prisma.writingSprint.findMany({
      where: {
        isActive: true,
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        // Include participant count and word counts
        participants: {
          select: {
            wordCount: true,
            userId: true,
            user: { select: { username: true } },
          },
          orderBy: { wordCount: 'desc' },
        },
      },
    });

    return NextResponse.json(sprints);
  } catch (err) {
    console.error('[sprints GET]', err);
    return serverError();
  }
}

// Validation schema for creating a sprint
const CreateSprintSchema = z.object({
  title:       z.string().min(1).max(100),
  durationMins: z.number().int().min(5).max(180), // 5 minutes to 3 hours
  startsAt:    z.string().datetime(),              // ISO string from client
});

// POST — create a sprint (admin only)
export async function POST(req: Request) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') return forbidden();

    const body = await req.json();
    const parsed = CreateSprintSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const { title, durationMins, startsAt } = parsed.data;
    const startDate = new Date(startsAt);
    const endDate   = new Date(startDate.getTime() + durationMins * 60 * 1000);

    const sprint = await prisma.writingSprint.create({
      data: {
        title,
        durationMins,
        startsAt: startDate,
        endsAt:   endDate,
      },
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (err) {
    console.error('[sprints POST]', err);
    return serverError();
  }
}
