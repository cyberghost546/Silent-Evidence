import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getIronSession } from 'iron-session';

interface SessionData { userId?: number }
const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? 'change-me-32-chars-minimum-secret!',
  cookieName: 'se_session',
};

// POST /api/bingo/check — toggle a cell checked/unchecked
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    if (!session.userId) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { templateId, cellIndex } = await req.json();
    if (typeof cellIndex !== 'number' || cellIndex < 0 || cellIndex > 24) {
      return NextResponse.json({ error: 'Invalid cell' }, { status: 400 });
    }

    // Ensure card exists (upsert)
    const card = await prisma.bingoCard.upsert({
      where: { templateId_userId: { templateId, userId: session.userId } },
      update: {},
      create: { templateId, userId: session.userId },
    });

    const existing = await prisma.bingoCellCheck.findUnique({
      where: { cardId_cellIndex: { cardId: card.id, cellIndex } },
    });

    if (existing) {
      await prisma.bingoCellCheck.delete({ where: { id: existing.id } });
      return NextResponse.json({ checked: false });
    }

    await prisma.bingoCellCheck.create({ data: { cardId: card.id, cellIndex } });
    return NextResponse.json({ checked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to toggle cell' }, { status: 500 });
  }
}
