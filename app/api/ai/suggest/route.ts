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

  const { content, title } = await req.json();
  if (typeof content !== 'string' || content.trim().length < 20) {
    return NextResponse.json({ error: 'Content too short.' }, { status: 400 });
  }

  // Take only the last 600 words to keep the prompt focused
  const words = content.trim().split(/\s+/);
  const excerpt = words.slice(-600).join(' ');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are a horror fiction writing assistant. The author is writing a story called "${title ?? 'Untitled'}". Here is the ending of what they have written so far:\n\n---\n${excerpt}\n---\n\nWrite ONE short paragraph (2–4 sentences) suggesting what could happen next. Make it atmospheric, suspenseful, and consistent with the horror genre. Do not recap what was written — just continue the story forward. Write in the same narrative voice as the excerpt.`,
      },
    ],
  });

  const suggestion = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ suggestion });
}
