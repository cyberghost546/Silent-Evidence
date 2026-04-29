// app/api/recipes/route.ts
// GET  — returns all horror recipes, optionally filtered by ?type=food|drink|ritual.
//        Each recipe includes aggregated emoji reaction counts (reactions table → reactionCounts map).
// POST — creates a new recipe for the logged-in user. Requires title, description, ingredients,
//        and steps. Generates a unique slug from the title + timestamp.
//        ingredients and steps are stored as JSON strings in the DB.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getIronSession } from 'iron-session';

interface SessionData { userId?: number }
const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? 'change-me-32-chars-minimum-secret!',
  cookieName: 'se_session',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // food | drink | ritual

    const recipes = await prisma.horrorRecipe.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { username: true, profile: { select: { avatar: true } } } },
        reactions: true,
      },
    });

    const data = recipes.map((r) => ({
      ...r,
      reactionCounts: r.reactions.reduce<Record<string, number>>((acc, rx) => {
        acc[rx.emoji] = (acc[rx.emoji] ?? 0) + 1;
        return acc;
      }, {}),
      reactions: undefined,
    }));

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to load recipes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
    if (!session.userId) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const body = await req.json();
    const { title, description, ingredients, steps, image, type, difficulty, prepMins, servings } = body;

    if (!title || !description || !ingredients || !steps) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;

    const recipe = await prisma.horrorRecipe.create({
      data: {
        title, slug, description,
        ingredients: JSON.stringify(ingredients),
        steps: JSON.stringify(steps),
        image: image ?? null,
        type: type ?? 'food',
        difficulty: difficulty ?? 'medium',
        prepMins: prepMins ?? null,
        servings: servings ?? null,
        authorId: session.userId,
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
