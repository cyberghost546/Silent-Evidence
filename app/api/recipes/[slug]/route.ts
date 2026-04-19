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
