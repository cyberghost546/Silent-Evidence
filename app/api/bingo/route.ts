import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getIronSession } from 'iron-session';

interface SessionData { userId?: number }
const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? 'change-me-32-chars-minimum-secret!',
  cookieName: 'se_session',
};

// GET /api/bingo — returns the active template + the user's card if logged in
export async function GET(req: NextRequest) {
  try {
    const template = await prisma.bingoTemplate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) return NextResponse.json({ template: null, checks: [] });

    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    let checks: number[] = [];

    if (session.userId) {
      const card = await prisma.bingoCard.findUnique({
        where: { templateId_userId: { templateId: template.id, userId: session.userId } },
        include: { checks: true },
      });
      checks = card?.checks.map((c) => c.cellIndex) ?? [];
    }

    return NextResponse.json({ template: { ...template, cells: JSON.parse(template.cells) }, checks });
  } catch {
    return NextResponse.json({ error: 'Failed to load bingo' }, { status: 500 });
  }
}
