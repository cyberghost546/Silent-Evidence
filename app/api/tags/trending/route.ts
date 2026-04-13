// GET /api/tags/trending — returns the top N tags ranked by number of published stories
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // How many tags to return — defaults to 20
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 20), 50);

  // Fetch all tags that have at least one published story, ordered by story count desc
  const tags = await prisma.tag.findMany({
    where: {
      stories: { some: { status: 'PUBLISHED' } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { stories: true } },
    },
    orderBy: { stories: { _count: 'desc' } },
    take: limit,
  });

  return NextResponse.json(tags);
}
