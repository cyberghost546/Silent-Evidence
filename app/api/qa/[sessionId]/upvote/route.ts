// app/api/qa/[sessionId]/upvote/route.ts
// POST — increments the upvote count on a question within a Q&A session.
// No auth required — anyone can upvote (rate limiting not implemented here).
// questionId must belong to the given sessionId (enforced by the updateMany where clause).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ sessionId: string }> };

// POST /api/qa/[sessionId]/upvote — upvote a question
export async function POST(req: NextRequest, { params }: Params) {
  const { sessionId } = await params;
  try {
    const { questionId } = await req.json();
    await prisma.liveQAQuestion.updateMany({
      where: { id: Number(questionId), sessionId: Number(sessionId) },
      data: { upvotes: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to upvote' }, { status: 500 });
  }
}
