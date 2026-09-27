// app/api/writing-prompts/route.ts
// API route for horror story writing prompts powered by Anthropic AI.
// GET  — returns the current active prompt (most recent, not expired).
// POST — admin only: generate a new horror-themed AI prompt and save it to the DB.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const ai = new Anthropic();

export async function GET() {
  // Return the most recent active prompt that hasn't expired
  const prompt = await prisma.writingPrompt.findFirst({
    where: {
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { entries: true } } },
  });

  return NextResponse.json(prompt ?? null);
}

export async function POST(req: NextRequest) {
  // Only admins can create / generate prompts
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  let promptText: string;
  let title: string;

  if (body.prompt && body.title) {
    // Manual prompt provided
    promptText = body.prompt;
    title = body.title;
  } else {
    // AI-generate a new horror story writing prompt via Anthropic Claude
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001', // Use fast Haiku model for prompt generation
      max_tokens: 200, // Cap response length to keep prompts concise
      messages: [
        {
          role: 'user',
          content:
            'Generate a single compelling horror story writing prompt in 2-3 sentences. ' +
            'It should be specific, atmospheric, and inspire dread or unease. ' +
            'Respond with JSON: {"title": "short label (max 8 words)", "prompt": "the full prompt text"}',
        },
      ],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    // Fall back to a default horror prompt if AI response parsing fails
    promptText =
      parsed.prompt ?? 'Write a horror story about something that should not exist but does.';
    title = parsed.title ?? `Prompt #${Date.now()}`;
  }

  // Expire the previous active prompt
  await prisma.writingPrompt.updateMany({
    where: { active: true },
    data: { active: false },
  });

  // Set expiry 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const created = await prisma.writingPrompt.create({
    data: { title, prompt: promptText, active: true, expiresAt },
  });

  return NextResponse.json(created, { status: 201 });
}
