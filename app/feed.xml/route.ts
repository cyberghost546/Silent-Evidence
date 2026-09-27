// app/feed.xml/route.ts
// Serves /feed.xml — an RSS 2.0 feed of the latest published stories.
// Compatible with all RSS readers (Feedly, NetNewsWire, etc.)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      createdAt: true,
      author: { select: { username: true } },
      category: { select: { name: true } },
    },
  });

  const items = stories
    .map(
      (s) => `
    <item>
      <title>${escapeXml(s.title)}</title>
      <link>${BASE_URL}/story/${s.slug}</link>
      <guid>${BASE_URL}/story/${s.slug}</guid>
      <pubDate>${s.createdAt.toUTCString()}</pubDate>
      <author>${escapeXml(s.author.username)}</author>
      <category>${escapeXml(s.category.name)}</category>
      ${s.excerpt ? `<description>${escapeXml(s.excerpt)}</description>` : ''}
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Silent Evidence — horror stories</title>
    <link>${BASE_URL}</link>
    <description>The latest horror stories from Silent Evidence</description>
    <language>en-us</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // cache for 1 hour
    },
  });
}
