// app/api/stories/[id]/scare-score/route.ts
// POST — calls Anthropic AI to rate a story's hype/excitement level (1-10), saves to DB.
//         Only callable by the story's author or an ADMIN.
// GET  — returns the current scareScore (public, any viewer).

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import {
  unauthorized,
  notFound,
  serverError,
  badRequest,
} from '@/lib/apiError';

// Route params shape for App Router dynamic segments
type Params = { params: Promise<{ id: string }> };

// ── GET /api/stories/[id]/scare-score ────────────────────────────────────────
// Public — returns { score: number | null, reason: string | null }
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const storyId = Number(id);

  if (!storyId || isNaN(storyId)) return badRequest('Invalid story ID.');

  // Only fetch the two fields we need — avoids loading the full story
  const story = await prisma.story.findUnique({
    where:  { id: storyId },
    select: { scareScore: true, scareReason: true },
  });

  if (!story) return notFound('Story not found.');

  // Return the current hype score and reason to the client
  return NextResponse.json({
    score:  story.scareScore  ?? null,
    reason: story.scareReason ?? null,
  });
}

// ── POST /api/stories/[id]/scare-score ───────────────────────────────────────
// Auth-gated — calls Claude Haiku, saves hype score + reason, returns both.
export async function POST(_req: NextRequest, { params }: Params) {
  // Read userId from the session cookie set at login
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return unauthorized();

  const { id } = await params;
  const storyId = Number(id);
  if (!storyId || isNaN(storyId)) return badRequest('Invalid story ID.');

  // Fetch the story — we need authorId, content, and the user's role
  const [story, caller] = await Promise.all([
    prisma.story.findUnique({
      where:  { id: storyId },
      select: { authorId: true, content: true, title: true },
    }),
    prisma.user.findUnique({
      where:  { id: userId },
      select: { role: true },
    }),
  ]);

  if (!story) return notFound('Story not found.');

  // Only the story author or a site ADMIN may request an AI hype score
  const isAuthor = story.authorId === userId;
  const isAdmin  = caller?.role === 'ADMIN';
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Only the author can request a hype score.' }, { status: 403 });
  }

  // Strip HTML tags so we send clean text to the AI
  const plainText = story.content
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';

  if (!plainText) return badRequest('Story has no readable content.');

  // Truncate to ~4,000 chars to stay well within Haiku's context window
  // and keep costs low — the model can assess tone from the opening
  const excerpt = plainText.slice(0, 4000);

  try {
    // Initialise the Anthropic client — reads ANTHROPIC_API_KEY from env
    const client = new Anthropic();

    // Ask Claude Haiku to rate the hype/excitement level on a 1-10 scale.
    // We use a strict output format so we can parse it reliably.
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [
        {
          role:    'user',
          content: `You are an horror story critic. Rate the following story excerpt on a HYPE SCORE from 1 (mildly interesting) to 10 (absolutely epic and unforgettable).

Respond with ONLY this JSON format (no markdown, no explanation outside the JSON):
{"score": <number 1-10>, "reason": "<one sentence explaining the score>"}

Story title: ${story.title ?? 'Untitled'}

Story excerpt:
${excerpt}`,
        },
      ],
    });

    // Extract the text block from the response
    const raw = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    // Parse the JSON the model returned
    let parsed: { score: number; reason: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If the model wrapped in markdown code fences, strip them and retry
      const stripped = raw.replace(/```json?|```/g, '').trim();
      parsed = JSON.parse(stripped);
    }

    // Clamp the hype score to the valid range just in case the model drifts
    const score  = Math.min(10, Math.max(1, Math.round(Number(parsed.score))));
    const reason = String(parsed.reason ?? '').trim();

    // Persist both hype score fields to the story record
    await prisma.story.update({
      where: { id: storyId },
      data:  { scareScore: score, scareReason: reason },
    });

    // Return the hype score and reason to the client
    return NextResponse.json({ score, reason });
  } catch (err) {
    console.error('[hype-score] Anthropic error:', err);
    return serverError('AI scoring failed. Please try again.');
  }
}
