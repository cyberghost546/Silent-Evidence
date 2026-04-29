// app/api/recipes/[slug]/route.ts
// GET — returns the full detail of a single horror recipe by its slug.
// ingredients and steps are stored as JSON strings in the DB and are parsed
// back to arrays before being returned so the client gets usable data.
// Aggregated emoji reactionCounts are computed from the reactions relation.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const recipe = await prisma.horrorRecipe.findUnique({
      where: { slug },
      include: {
        author: { select: { username: true, profile: { select: { avatar: true } } } },
        reactions: true,
      },
    });
    if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients),
      steps: JSON.parse(recipe.steps),
      reactionCounts: recipe.reactions.reduce<Record<string, number>>((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
        return acc;
      }, {}),
      reactions: undefined,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load recipe' }, { status: 500 });
  }
}
