// app/api/qa/[sessionId]/questions/route.ts
// GET  — returns all questions for a Q&A session, sorted: unanswered first,
//         then by upvotes desc, then by creation time asc (oldest first).
// POST — submits a new question to the session. Supports anonymous questions.
//        Questions under 5 characters are rejected.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getIronSession } from 'iron-session';

interface SessionData { userId?: number }
const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? 'change-me-32-chars-minimum-secret!',
  cookieName: 'se_session',
};

type Params = { params: Promise<{ sessionId: string }> };

// GET — load all questions for a session, sorted by upvotes desc
export async function GET(_req: NextRequest, { params }: Params) {
  const { sessionId } = await params;
  try {
    const questions = await prisma.liveQAQuestion.findMany({
      where: { sessionId: Number(sessionId) },
      orderBy: [{ answered: 'asc' }, { upvotes: 'desc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(questions);
  } catch {
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }
}

// POST — submit a new question
export async function POST(req: NextRequest, { params }: Params) {
  const { sessionId } = await params;
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    const { question, isAnonymous } = await req.json();

    if (!question || question.trim().length < 5) {
      return NextResponse.json({ error: 'Question too short' }, { status: 400 });
    }

    const qa = await prisma.liveQASession.findUnique({ where: { id: Number(sessionId) } });
    if (!qa || !qa.isActive) return NextResponse.json({ error: 'Session not active' }, { status: 403 });

    const created = await prisma.liveQAQuestion.create({
      data: {
        sessionId: Number(sessionId),
        question: question.trim(),
        isAnonymous: isAnonymous ?? false,
        askerId: session.userId && !isAnonymous ? session.userId : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to submit question' }, { status: 500 });
  }
}
