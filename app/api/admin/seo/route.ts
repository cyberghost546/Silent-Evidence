// app/api/admin/seo/route.ts
// GET — returns SEO-relevant data: top stories by views, most-used tags,
//        category traffic breakdown, and recent 404s from the SiteSetting log.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const [topStories, topCategories, topTags, notFoundLog] = await Promise.all([
    // Top 20 stories by views
    prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { views: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true } },
        author: { select: { username: true } },
        category: { select: { name: true } },
      },
    }),
    // Category breakdown by story count + total views
    prisma.category.findMany({
      select: {
        name: true,
        slug: true,
        stories: {
          where: { status: 'PUBLISHED' },
          select: { views: true },
        },
      },
    }),
    // Top tags by story count
    prisma.tag.findMany({
      orderBy: { stories: { _count: 'desc' } },
      take: 20,
      select: { name: true, slug: true, _count: { select: { stories: true } } },
    }),
    // 404 log stored as JSON in SiteSetting
    prisma.siteSetting.findUnique({ where: { key: 'seo_404_log' } }),
  ]);

  const categories = topCategories
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      count: c.stories.length,
      views: c.stories.reduce((s, st) => s + st.views, 0),
    }))
    .sort((a, b) => b.views - a.views);

  const notFounds: { path: string; count: number; lastSeen: string }[] = notFoundLog?.value
    ? (() => {
        try {
          return JSON.parse(notFoundLog.value);
        } catch {
          return [];
        }
      })()
    : [];

  return NextResponse.json({ topStories, categories, topTags, notFounds });
}
