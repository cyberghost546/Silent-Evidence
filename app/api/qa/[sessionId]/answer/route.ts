// app/api/qa/[sessionId]/answer/route.ts
// POST — lets the Q&A session author post an answer to a specific question.
// Marks the question as answered and stores the answer text.
// Only the session owner (the author whose userId matches the session) can answer.
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

// POST — author posts an answer to a question
export async function POST(req: NextRequest, { params }: Params) {
  const { sessionId } = await params;
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    if (!session.userId) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { questionId, answer } = await req.json();
    if (!answer || answer.trim().length < 2) {
      return NextResponse.json({ error: 'Answer too short' }, { status: 400 });
    }

    // Verify the session belongs to this user
    const qa = await prisma.liveQASession.findUnique({ where: { id: Number(sessionId) } });
    if (!qa || qa.authorId !== session.userId) {
      return NextResponse.json({ error: 'Not your session' }, { status: 403 });
    }

    const updated = await prisma.liveQAQuestion.update({
      where: { id: Number(questionId) },
      data: { answer: answer.trim(), answered: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to post answer' }, { status: 500 });
  }
}
