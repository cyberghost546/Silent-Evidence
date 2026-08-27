// app/api/awards/vote/route.ts
// POST — casts a vote for a Scream Award nomination.
// One vote per user per award category is enforced: we check whether the user
// has already voted on any nomination in the same category and block them if so.
// Session is read via iron-session (se_session cookie).
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

// POST /api/awards/vote — cast a vote for a nomination
// One vote per user per category (enforced by checking existing votes in the same category)
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    if (!session.userId) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { nominationId } = await req.json();
    if (!nominationId)
      return NextResponse.json({ error: 'nominationId required' }, { status: 400 });

    // Load nomination to get its category
    const nomination = await prisma.screamNomination.findUnique({
      where: { id: nominationId },
      include: { category: { include: { award: true } } },
    });
    if (!nomination) return NextResponse.json({ error: 'Nomination not found' }, { status: 404 });
    if (!nomination.category.award.isOpen) {
      return NextResponse.json({ error: 'Voting is closed' }, { status: 403 });
    }

    // Check if user already voted in this category
    const existingVote = await prisma.screamVote.findFirst({
      where: {
        userId: session.userId,
        nomination: { categoryId: nomination.categoryId },
      },
    });
    if (existingVote) {
      // Switch vote: remove old, add new
      if (existingVote.nominationId === nominationId) {
        return NextResponse.json({ error: 'Already voted for this nominee' }, { status: 409 });
      }
      await prisma.screamVote.delete({ where: { id: existingVote.id } });
    }

    await prisma.screamVote.create({ data: { nominationId, userId: session.userId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}

// GET /api/awards/vote — get the current user's votes for the latest award
export async function GET() {
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    if (!session.userId) return NextResponse.json({ votes: [] });

    const votes = await prisma.screamVote.findMany({
      where: { userId: session.userId },
      select: { nominationId: true },
    });
    return NextResponse.json({ votes: votes.map((v) => v.nominationId) });
  } catch {
    return NextResponse.json({ error: 'Failed to load votes' }, { status: 500 });
  }
}
