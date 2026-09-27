// app/api/monsters/route.ts
// GET — returns all monsters from the DB, ordered by scareFactor desc then name asc.
// Supports ?type=Supernatural|Creature|Psychological|Paranormal and ?q=search term
// for client-side filtering in MonsterEncyclopedia. No auth required — public data.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const q = searchParams.get('q');

    const monsters = await prisma.monster.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: [{ scareFactor: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        origin: true,
        image: true,
        type: true,
        scareFactor: true,
        _count: { select: { storyLinks: true } },
      },
    });

    return NextResponse.json(monsters);
  } catch {
    return NextResponse.json({ error: 'Failed to load monsters' }, { status: 500 });
  }
}

// Admin-only: create a new monster entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, origin, image, type, scareFactor } = body;
    if (!name || !description || !type) {
      return NextResponse.json(
        { error: 'name, description, and type are required' },
        { status: 400 }
      );
    }
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const monster = await prisma.monster.create({
      data: { name, slug, description, origin, image, type, scareFactor: scareFactor ?? 5 },
    });
    return NextResponse.json(monster, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create monster' }, { status: 500 });
  }
}
