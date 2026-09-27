// app/api/stories/presence/route.ts
// POST — heartbeat: upserts a StoryPresence record to mark this session as active
// GET  — returns the count of readers active in the last 2 minutes for a story

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// A session is considered "active" if it sent a heartbeat within the last 2 minutes
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

// POST /api/stories/presence — body: { storyId, sessionId }
export async function POST(req: NextRequest) {
  const { storyId, sessionId } = await req.json();
  if (!storyId || !sessionId) {
    return NextResponse.json({ error: 'storyId and sessionId required' }, { status: 400 });
  }

  // Upsert the presence record — updates lastSeenAt each heartbeat
  await prisma.storyPresence.upsert({
    where: { storyId_sessionId: { storyId: Number(storyId), sessionId } },
    create: { storyId: Number(storyId), sessionId, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });

  // Clean up stale sessions (older than 2 minutes) to keep the table tidy
  prisma.storyPresence
    .deleteMany({
      where: { lastSeenAt: { lt: new Date(Date.now() - ACTIVE_WINDOW_MS) } },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}

// GET /api/stories/presence?storyId=X — returns current active reader count
export async function GET(req: NextRequest) {
  const storyId = Number(req.nextUrl.searchParams.get('storyId') ?? 0);
  if (!storyId) return NextResponse.json({ count: 0 });

  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const count = await prisma.storyPresence.count({
    where: { storyId, lastSeenAt: { gte: cutoff } },
  });

  return NextResponse.json({ count });
}
