import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/qa — list all active sessions (for the landing page)
export async function GET() {
  try {
    const sessions = await prisma.liveQASession.findMany({
      where: { isActive: true },
      orderBy: { startsAt: 'desc' },
      include: {
        author: { select: { username: true, profile: { select: { avatar: true } } } },
        _count: { select: { questions: true } },
      },
    });
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}
