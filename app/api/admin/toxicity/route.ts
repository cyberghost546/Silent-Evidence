// app/api/admin/toxicity/route.ts
// POST — scans the latest unreviewed comments (and optionally story excerpts) for
//         toxic content using Claude. Returns a list of flagged items with scores
//         and reasons. The admin can then dismiss or delete each one.

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

const client = new Anthropic();

type Item = { type: 'comment' | 'story'; id: number; text: string; authorId: number; authorName: string };

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { mode = 'comments' } = await req.json().catch(() => ({}));

  // Fetch recent unreviewed content
  const items: Item[] = [];

  if (mode === 'comments' || mode === 'both') {
    const comments = await prisma.comment.findMany({
      where: { flagged: false },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, content: true, userId: true, user: { select: { username: true } } },
    });
    for (const c of comments) {
      items.push({ type: 'comment', id: c.id, text: c.content, authorId: c.userId, authorName: c.user.username });
    }
  }

  if (mode === 'stories' || mode === 'both') {
    const stories = await prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, excerpt: true, authorId: true, author: { select: { username: true } } },
    });
    for (const s of stories) {
      if (s.excerpt) {
        items.push({ type: 'story', id: s.id, text: `${s.title}: ${s.excerpt}`, authorId: s.authorId, authorName: s.author.username });
      }
    }
  }

  if (items.length === 0) return NextResponse.json({ flagged: [] });

  // Build the prompt — send all items in one request to minimise API calls
  const itemList = items.map((it, i) => `[${i}] ${it.type.toUpperCase()} by ${it.authorName}: ${it.text.slice(0, 300)}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a content moderation assistant for a horror fiction website. Horror content (gore, dark themes, violence in fictional context) is ALLOWED — only flag genuine harassment, hate speech, spam, doxxing, or real-world threats.\n\nReview each item below and return a JSON array of objects for items that should be reviewed by a human moderator. Only include genuinely problematic items — be conservative. Each object must have: index (number), reason (string, one sentence), severity ("low"|"medium"|"high").\n\nItems:\n${itemList}\n\nReturn only a JSON array. If nothing is problematic, return [].`,
    }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]';
  let parsed: { index: number; reason: string; severity: string }[] = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : [];
  } catch { parsed = []; }

  const flagged = parsed
    .filter(p => typeof p.index === 'number' && p.index < items.length)
    .map(p => ({ ...items[p.index], reason: p.reason, severity: p.severity }));

  return NextResponse.json({ flagged, scanned: items.length });
}
