// app/api/recipes/react/route.ts
// POST — toggles an emoji reaction on a horror recipe.
// Only the four emojis in ALLOWED are accepted. If the user has already reacted
// with the same emoji it is removed (un-react); otherwise it is created.
// Login required via iron-session.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getIronSession } from 'iron-session';

interface SessionData { userId?: number }
const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? 'change-me-32-chars-minimum-secret!',
  cookieName: 'se_session',
};

const ALLOWED = ['🔥', '💀', '😋', '👻'];

export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    if (!session.userId) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { recipeId, emoji } = await req.json();
    if (!ALLOWED.includes(emoji)) return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });

    const existing = await prisma.recipeReaction.findFirst({
      where: { recipeId, userId: session.userId, emoji },
    });

    if (existing) {
      await prisma.recipeReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ removed: true });
    }

    await prisma.recipeReaction.create({ data: { recipeId, userId: session.userId, emoji } });
    return NextResponse.json({ added: true });
  } catch {
    return NextResponse.json({ error: 'Failed to react' }, { status: 500 });
  }
}
