// app/api/book-club/route.ts
// GET  — list public clubs + clubs the user belongs to
// POST — create a new book club (logged-in users only)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { unauthorized, serverError } from '@/lib/apiError';
import { nanoid } from 'nanoid';
import { hasPremiumAccess } from '@/lib/premiumCheck';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

    const clubs = await prisma.bookClub.findMany({
      where: {
        OR: [
          { isPrivate: false },
          ...(userId ? [{ members: { some: { userId } } }] : []),
          ...(userId ? [{ ownerId: userId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { username: true, profile: { select: { avatar: true } } } },
        _count: { select: { members: true } },
        story: {
          select: { id: true, title: true, slug: true, coverImage: true,
            author: { select: { username: true } } },
        },
      },
    });

    return NextResponse.json(clubs);
  } catch (err) {
    console.error('[GET /api/book-club]', err);
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    const { name, description, isPrivate, isPremium, storyId } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    // Premium clubs can only be created by admins or premium subscribers
    if (isPremium && !await hasPremiumAccess(userId)) {
      return NextResponse.json({ error: 'Premium subscription required to create a premium club.' }, { status: 403 });
    }

    const club = await prisma.bookClub.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPrivate: isPrivate !== false,
        isPremium:  isPremium === true,
        inviteCode: nanoid(8).toUpperCase(),
        ownerId: userId,
        storyId: storyId ? Number(storyId) : null,
        members: { create: { userId } }, // owner auto-joins
      },
      include: {
        owner: { select: { username: true } },
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(club, { status: 201 });
  } catch (err) {
    console.error('[POST /api/book-club]', err);
    return serverError();
  }
}
