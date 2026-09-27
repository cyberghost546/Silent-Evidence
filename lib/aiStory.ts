// lib/aiStory.ts
//
// Shared AI story generation, used by the admin generator route and the
// automated "house author" cron bot. Extracted here so both call the exact same
// prompt and parsing rather than keeping two copies in sync.
//
// PROVIDER: uses the local Ollama model when OLLAMA_GENERATION=true (free, keeps
// Claude credits for the chatbot), otherwise Claude.

import Anthropic from '@anthropic-ai/sdk';

const USE_OLLAMA = process.env.OLLAMA_GENERATION === 'true';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';

export interface GeneratedStory {
  title: string;
  excerpt: string | null;
  content: string;
}

export interface GenerateParams {
  categoryName: string;
  /** A Mood enum value, or empty for "any". */
  mood?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  seedPrompt?: string;
}

async function callModel(prompt: string): Promise<string> {
  if (USE_OLLAMA) {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
    const data = await res.json();
    return data.response ?? '';
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content[0].type === 'text' ? message.content[0].text : '';
}

/**
 * Generates one complete horror story. Returns the parsed title/excerpt/content,
 * or throws if the model output could not be parsed into a usable story.
 */
export async function generateStory(params: GenerateParams): Promise<GeneratedStory> {
  const wordCount =
    params.length === 'short' ? '400-600' : params.length === 'long' ? '1200-1800' : '700-1000';

  const prompt = `You are a talented horror and mystery story writer. Write an original, gripping ${params.categoryName.toLowerCase()} story for the "Silent Evidence" community website.

Requirements:
- Category: ${params.categoryName}
- Mood: ${params.mood || 'any horror mood'}
- Tone: ${params.tone || 'dark and unsettling'}
- Length: ${wordCount} words
${params.seedPrompt ? `- Story seed/inspiration: ${params.seedPrompt}` : ''}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "title": "The story title here",
  "excerpt": "A 1-2 sentence teaser that hooks the reader without spoiling the ending.",
  "content": "The full story HTML here. Use <p> tags for paragraphs. You may use <em> for emphasis."
}

Make the story original, immersive, and genuinely unsettling. End with a memorable twist or haunting final line.`;

  const rawText = await callModel(prompt);

  // The model may wrap the JSON in code fences or prose; grab the object.
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Model did not return parseable JSON.');

  const parsed = JSON.parse(jsonMatch[0]) as Partial<GeneratedStory>;
  if (!parsed.title || !parsed.content) throw new Error('Model response missing title or content.');

  return {
    title: parsed.title,
    excerpt: parsed.excerpt ?? null,
    content: parsed.content,
  };
}

/** Turns a title into a unique URL slug (timestamp suffix guarantees uniqueness). */
export function slugForTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${Date.now()}`;
}
