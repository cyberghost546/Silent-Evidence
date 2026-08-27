// app/api/cron/house-author/route.ts
//
// The "house author" bot: on a schedule, generates one AI horror story and
// publishes it under a designated bot account. This keeps the front page fresh
// between human submissions.
//
// TRANSPARENCY (important, and required by our own Terms/AUP): the bot posts
// under a real, clearly-labelled account — never as a fake human. Point
// HOUSE_AUTHOR_EMAIL at an account whose profile makes clear it is AI-written
// house content. If HOUSE_AUTHOR_EMAIL is not set, this endpoint does nothing.
//
// SAFETY: generated content is sanitised and run through the same toxicity check
// as human submissions before publishing, so an off-the-rails generation cannot
// go live unreviewed.
//
// AUTH: protected by CRON_SECRET, like the other cron routes.
//   GET /api/cron/house-author
//   Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateStory, slugForTitle } from '@/lib/aiStory';
import { sanitizeContent } from '@/lib/sanitize';
import { checkStoryToxicity } from '@/lib/toxicityCheck';
import { MOODS } from '@/lib/moods';
import { announceNewStory } from '@/lib/discord';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const houseEmail = process.env.HOUSE_AUTHOR_EMAIL?.trim().toLowerCase();
  if (!houseEmail) {
    return NextResponse.json({ ok: true, skipped: 'HOUSE_AUTHOR_EMAIL not set' });
  }

  try {
    // The bot account must exist. It is a normal account you create and label as
    // AI/house content; we never invent an author.
    const author = await prisma.user.findFirst({
      where: { email: houseEmail },
      select: { id: true },
    });
    if (!author) {
      return NextResponse.json(
        { ok: false, error: `No account for HOUSE_AUTHOR_EMAIL (${houseEmail}). Create it first.` },
        { status: 400 }
      );
    }

    // Pick a random category and mood for variety.
    const categories = await prisma.category.findMany({ select: { id: true, name: true } });
    if (categories.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No categories to write for.' },
        { status: 400 }
      );
    }
    const category = pick(categories);
    const mood = pick(MOODS);

    // Generate.
    const draft = await generateStory({ categoryName: category.name, mood, length: 'medium' });

    // Moderate before publishing — same gate as human stories.
    const toxicity = await checkStoryToxicity(
      draft.title,
      draft.excerpt ?? draft.content.slice(0, 1000)
    );
    if (toxicity.flagged) {
      // Do not publish; record it so the run is visible but nothing bad goes live.
      console.warn('[cron/house-author] generation flagged by moderation:', toxicity.reason);
      return NextResponse.json({
        ok: true,
        published: false,
        flagged: toxicity.reason ?? 'policy',
      });
    }

    const content = sanitizeContent(draft.content);

    const story = await prisma.story.create({
      data: {
        title: draft.title,
        slug: slugForTitle(draft.title),
        excerpt: draft.excerpt,
        content,
        status: 'PUBLISHED',
        authorId: author.id,
        categoryId: category.id,
        mood: mood as never,
        language: 'en',
      },
      select: { id: true, slug: true, title: true },
    });

    console.log('[cron/house-author] published', JSON.stringify(story));

    // Announce to Discord if a webhook is configured (fire-and-forget).
    announceNewStory({
      title: story.title,
      slug: story.slug,
      excerpt: draft.excerpt,
      categoryName: category.name,
    }).catch(() => {});

    return NextResponse.json({ ok: true, published: true, story, category: category.name, mood });
  } catch (err) {
    console.error('[cron/house-author]', err);
    return NextResponse.json({ error: 'House-author generation failed.' }, { status: 500 });
  }
}
