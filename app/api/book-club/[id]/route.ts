// app/api/book-club/[id]/route.ts
// GET   — fetch a single club with members and current story
// PATCH — update club (owner only): name, description, storyId

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { unauthorized, serverError } from '@/lib/apiError';

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const clubId = Number(id);

    const club = await prisma.bookClub.findUnique({
      where: { id: clubId },
      include: {
        owner: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
        members: {
          orderBy: { joinedAt: 'asc' },
          include: {
            user: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
          },
        },
        story: {
          select: {
            id: true, title: true, slug: true, coverImage: true, excerpt: true,
            author: { select: { username: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    });

    if (!club) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(club);
  } catch (err) {
    console.error('[GET /api/book-club/[id]]', err);
    return serverError();
  }
}

export async function PATCH(req: Request, { params }: Props) {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    const { id } = await params;
    const clubId = Number(id);

    const club = await prisma.bookClub.findUnique({ where: { id: clubId } });
    if (!club) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (club.ownerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, description, storyId, isPrivate } = await req.json();

    const updated = await prisma.bookClub.update({
      where: { id: clubId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(storyId !== undefined ? { storyId: storyId ? Number(storyId) : null } : {}),
        ...(isPrivate !== undefined ? { isPrivate } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/book-club/[id]]', err);
    return serverError();
  }
}
