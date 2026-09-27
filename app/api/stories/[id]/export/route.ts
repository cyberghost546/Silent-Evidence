// app/api/stories/[id]/export/route.ts
// GET /api/stories/[id]/export?format=txt|md
// Downloads the story as plain text or Markdown. Only the story author may export.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// Strips HTML tags for plain-text export
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET(req: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  const storyId = Number(id);
  if (!Number.isFinite(storyId) || storyId <= 0) {
    return NextResponse.json({ error: 'Invalid story ID.' }, { status: 400 });
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: {
      title: true,
      content: true,
      excerpt: true,
      authorId: true,
      author: { select: { username: true } },
      category: { select: { name: true } },
      createdAt: true,
      tags: { select: { name: true } },
    },
  });

  if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  if (story.authorId !== userId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') ?? 'txt';

  const plainContent = stripHtml(story.content);
  const date = story.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const tags = story.tags.map((t) => t.name).join(', ');
  const safeFilename = story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  if (format === 'md') {
    const md = [
      `# ${story.title}`,
      ``,
      `**Author:** ${story.author.username}  `,
      `**Category:** ${story.category.name}  `,
      `**Published:** ${date}  `,
      tags ? `**Tags:** ${tags}` : '',
      story.excerpt ? `\n> ${story.excerpt}` : '',
      ``,
      `---`,
      ``,
      plainContent,
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}.md"`,
      },
    });
  }

  // Default: plain text
  const txt = [
    story.title.toUpperCase(),
    '='.repeat(Math.min(story.title.length, 60)),
    ``,
    `Author:    ${story.author.username}`,
    `Category:  ${story.category.name}`,
    `Published: ${date}`,
    tags ? `Tags:      ${tags}` : '',
    ``,
    story.excerpt ? `${story.excerpt}\n` : '',
    `${'─'.repeat(60)}`,
    ``,
    plainContent,
    ``,
    `${'─'.repeat(60)}`,
    `Exported from Silent Evidence — silentevidence.com`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}.txt"`,
    },
  });
}
