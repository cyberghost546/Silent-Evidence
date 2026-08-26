// app/api/confessions/route.ts
// GET  — returns the 50 most recent confessions, with per-emoji reaction counts aggregated
//        from the reactions table. Anonymous confessions omit the author field.
// POST — creates a new confession for the current session user (login optional;
//        isAnonymous defaults to true). Content must be 5–500 characters.
// Session is read via iron-session (se_session cookie) rather than the plain userId cookie
// used by most other routes — both patterns work the same way under the hood.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getIronSession } from 'iron-session';

interface SessionData {
  userId?: number;
}
const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? 'change-me-32-chars-minimum-secret!',
  cookieName: 'se_session',
};

export async function GET() {
  try {
    const confessions = await prisma.confession.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true, profile: { select: { avatar: true } } } },
        reactions: true,
      },
    });

    const data = confessions.map((c) => ({
      id: c.id,
      content: c.content,
      isAnonymous: c.isAnonymous,
      createdAt: c.createdAt,
      author: c.isAnonymous
        ? null
        : c.user
          ? { username: c.user.username, avatar: c.user.profile?.avatar ?? null }
          : null,
      reactionCounts: c.reactions.reduce<Record<string, number>>((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
        return acc;
      }, {}),
    }));

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to load confessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    const { content, isAnonymous } = await req.json();

    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return NextResponse.json({ error: 'Confession too short' }, { status: 400 });
    }
    if (content.trim().length > 500) {
      return NextResponse.json({ error: 'Confession too long (max 500 chars)' }, { status: 400 });
    }

    const confession = await prisma.confession.create({
      data: {
        content: content.trim(),
        isAnonymous: isAnonymous !== false,
        userId: session.userId ?? null,
      },
    });

    return NextResponse.json(confession, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to post confession' }, { status: 500 });
  }
}
