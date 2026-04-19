import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/awards — returns the most recent open (or latest) award with categories + nominations + vote counts
export async function GET() {
  try {
    const award = await prisma.screamAward.findFirst({
      orderBy: { year: 'desc' },
      include: {
        categories: {
          include: {
            nominations: {
              include: {
                _count: { select: { votes: true } },
              },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!award) return NextResponse.json({ award: null });
    return NextResponse.json({ award });
  } catch {
    return NextResponse.json({ error: 'Failed to load awards' }, { status: 500 });
  }
}
