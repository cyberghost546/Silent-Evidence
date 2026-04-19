// app/api/book-club/join/route.ts
// POST — join a club using an invite code (for private clubs) or club ID (public)
// DELETE — leave a club (not the owner)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { unauthorized, serverError } from '@/lib/apiError';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    const { inviteCode, clubId: rawClubId } = await req.json();

    let club;
    if (inviteCode) {
      club = await prisma.bookClub.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
    } else if (rawClubId) {
      club = await prisma.bookClub.findUnique({ where: { id: Number(rawClubId), isPrivate: false } });
    }

    if (!club) return NextResponse.json({ error: 'Club not found or invalid invite code' }, { status: 404 });

    // Premium clubs require an active subscription
    if (club.isPremium) {
      const sub = await prisma.subscription.findUnique({ where: { userId }, select: { status: true } });
      if (sub?.status !== 'active') {
        return NextResponse.json({ error: 'This is a premium-only club. Upgrade to join.' }, { status: 403 });
      }
    }

    // Upsert — safe if they're already a member
    await prisma.bookClubMember.upsert({
      where: { clubId_userId: { clubId: club.id, userId } },
      update: {},
      create: { clubId: club.id, userId },
    });

    return NextResponse.json({ clubId: club.id, name: club.name });
  } catch (err) {
    console.error('[POST /api/book-club/join]', err);
    return serverError();
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    const { clubId } = await req.json();
    const club = await prisma.bookClub.findUnique({ where: { id: Number(clubId) } });
    if (!club) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (club.ownerId === userId) {
      return NextResponse.json({ error: 'Owner cannot leave — transfer ownership or delete the club' }, { status: 400 });
    }

    await prisma.bookClubMember.delete({
      where: { clubId_userId: { clubId: Number(clubId), userId } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/book-club/join]', err);
    return serverError();
  }
}
