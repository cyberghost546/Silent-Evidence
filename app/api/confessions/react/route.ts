// app/api/confessions/react/route.ts
// POST — adds or removes an emoji reaction on a confession (toggle).
// Only the four horror-themed emojis in ALLOWED_EMOJIS are accepted —
// any other emoji gets a 400 response to prevent spam.
// If the user already reacted with the same emoji, the reaction is deleted (un-react).
// Session is read via iron-session (se_session cookie); login is required.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getIronSession } from 'iron-session';
import { CONFESSION_REACTION_IDS } from '@/lib/reactions';

interface SessionData { userId?: number }
const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? 'change-me-32-chars-minimum-secret!',
  cookieName: 'se_session',
};

// Allowlist comes from the shared reaction definitions so the server and the
// ConfessionBooth UI can never offer different sets.
const ALLOWED_EMOJIS = CONFESSION_REACTION_IDS;

export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    if (!session.userId) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { confessionId, emoji } = await req.json();
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const existing = await prisma.confessionReaction.findFirst({
      where: { confessionId, userId: session.userId, emoji },
    });

    if (existing) {
      await prisma.confessionReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ removed: true });
    }

    await prisma.confessionReaction.create({
      data: { confessionId, userId: session.userId, emoji },
    });

    return NextResponse.json({ added: true });
  } catch {
    return NextResponse.json({ error: 'Failed to react' }, { status: 500 });
  }
}
