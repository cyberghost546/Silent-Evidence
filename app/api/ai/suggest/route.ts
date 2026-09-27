// app/api/ai/suggest/route.ts
// POST — accepts the last ~500 words of a story and returns a short "what happens next"
// continuation suggestion using Claude. Only available to logged-in users.

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSessionUserId } from '@/lib/session';

const client = new Anthropic();

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { content, title, mode = 'continue' } = await req.json();

  if (mode === 'continue' && (typeof content !== 'string' || content.trim().length < 20)) {
    return NextResponse.json({ error: 'Content too short.' }, { status: 400 });
  }

  const words = (content ?? '').trim().split(/\s+/);
  const excerpt = words.slice(-600).join(' ');

  const promptMap: Record<string, string> = {
    continue: `You are a horror fiction writing assistant. The author is writing a story called "${title ?? 'Untitled'}". Here is what they have written so far:\n\n---\n${excerpt}\n---\n\nWrite ONE short paragraph (2–4 sentences) suggesting what could happen next. Make it atmospheric, suspenseful, and consistent with the horror genre. Do not recap — just continue forward in the same voice.`,
    prompt: `You are a horror fiction writing assistant. Write an atmospheric, chilling opening paragraph (3–5 sentences) for a horror story titled "${title ?? 'Untitled'}". Set a dark, suspenseful tone. No dialogue, just narration.`,
    title: `You are a horror fiction writing assistant. Based on this story excerpt, suggest 3 short, haunting story titles (one per line, no numbering, no quotes):\n\n${excerpt}`,
  };

  const systemPrompt = promptMap[mode] ?? promptMap.continue;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: mode === 'title' ? 80 : 300,
    messages: [{ role: 'user', content: systemPrompt }],
  });

  const suggestion = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ suggestion });
}
