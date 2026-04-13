import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const { slug } = await params;

  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      author: { select: { username: true } },
      stories: {
        where: { status: 'PUBLISHED' },
        orderBy: { seriesOrder: 'asc' },
        select: {
          id: true, title: true, slug: true, excerpt: true,
          coverImage: true, seriesOrder: true, content: true, createdAt: true,
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });

  if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(series);
}
