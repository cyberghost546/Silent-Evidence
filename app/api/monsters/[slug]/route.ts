import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const monster = await prisma.monster.findUnique({
      where: { slug },
      include: {
        storyLinks: true,
      },
    });
    if (!monster) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(monster);
  } catch {
    return NextResponse.json({ error: 'Failed to load monster' }, { status: 500 });
  }
}
