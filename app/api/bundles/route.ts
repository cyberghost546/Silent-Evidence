// app/api/bundles/route.ts
// GET — public list of active story bundles with their included stories.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const bundles = await prisma.storyBundle.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          story: {
            select: {
              id: true, title: true, slug: true, coverImage: true, excerpt: true,
              author:   { select: { username: true } },
              category: { select: { name: true } },
              _count:   { select: { likes: true } },
            },
          },
        },
      },
      _count: { select: { purchases: true } },
    },
  });
  return NextResponse.json(bundles);
}
