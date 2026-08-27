// app/api/coauthor-requests/route.ts
// GET  — list open co-author requests (paginated, newest first)
// POST — create a new co-author request (auth required)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unauthorized, zodError, serverError } from '@/lib/apiError';

// GET — public listing of open requests
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const take = 20;
  const skip = (page - 1) * take;

  try {
    const [requests, total] = await Promise.all([
      prisma.coauthorRequest.findMany({
        where: { isOpen: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          // Include the author's name and avatar for the card
          author: { select: { username: true, profile: { select: { avatar: true } } } },
        },
      }),
      prisma.coauthorRequest.count({ where: { isOpen: true } }),
    ]);

    return NextResponse.json({
      requests,
      total,
      page,
      pages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error('[coauthor-requests GET]', err);
    return serverError();
  }
}

// Validation for creating a request
const CreateSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(2000),
  genres: z.string().max(200).optional(), // comma-separated
});

// POST — create a new co-author request
export async function POST(req: Request) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const { title, description, genres } = parsed.data;

    const request = await prisma.coauthorRequest.create({
      data: { title, description, genres: genres ?? null, authorId: userId },
      include: {
        author: { select: { username: true, profile: { select: { avatar: true } } } },
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    console.error('[coauthor-requests POST]', err);
    return serverError();
  }
}
