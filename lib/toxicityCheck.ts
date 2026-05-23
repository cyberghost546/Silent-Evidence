// lib/toxicityCheck.ts
// Checks content for hate speech or harassment.
// When OLLAMA_BASE_URL is set, uses the local Ollama model (free).
// Falls back to Claude Haiku when Ollama is not available.
// Returns { flagged: boolean, reason?: string }.
// Called server-side from the comments and stories POST routes.

import Anthropic from '@anthropic-ai/sdk';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';

async function runOllamaToxicityCheck(
  prompt: string
): Promise<{ flagged: boolean; reason?: string } | null> {
  if (!OLLAMA_BASE_URL) return null;
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.response ?? '{}';
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    return { flagged: parsed.flagged === true, reason: parsed.reason ?? undefined };
  } catch {
    return null;
  }
}

const ai = new Anthropic();

async function runClaudeToxicityCheck(
  prompt: string,
  maxTokens: number
): Promise<{ flagged: boolean; reason?: string }> {
  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    return { flagged: parsed.flagged === true, reason: parsed.reason ?? undefined };
  } catch {
    return { flagged: false };
  }
}

export async function checkToxicity(text: string): Promise<{ flagged: boolean; reason?: string }> {
  if (text.trim().length < 10) return { flagged: false };

  const prompt =
    `You are a content moderator. Does the following comment contain hate speech, harassment, threats, slurs, or targeted abuse? ` +
    `Reply with JSON only: {"flagged": true/false, "reason": "brief reason if flagged or null"}.\n\nComment: """${text.slice(0, 500)}"""`;

  return (await runOllamaToxicityCheck(prompt)) ?? (await runClaudeToxicityCheck(prompt, 60));
}

/**
 * checkStoryToxicity — checks a story's title and content snippet for policy violations.
 * Uses a different prompt than comments because horror fiction is allowed — we only flag
 * real-world hate speech, harassment, doxxing, or illegal content, NOT fictional horror.
 *
 * @param title   - The story title
 * @param content - First ~1000 characters of the story body (enough to detect patterns)
 */
export async function checkStoryToxicity(
  title: string,
  content: string
): Promise<{ flagged: boolean; reason?: string }> {
  if (title.length + content.length < 20) return { flagged: false };

  const prompt =
    `You are a content moderator for a horror fiction platform. Dark themes (violence, death, conflict) are ALLOWED — this is a creative writing platform. ` +
    `Only flag content that contains REAL-WORLD hate speech targeting real groups, doxxing/personal info, instructions for real violence, CSAM references, or spam/scam links. ` +
    `Do NOT flag fictional violence, dark themes, or intense storytelling. ` +
    `Reply with JSON only: {"flagged": true/false, "reason": "brief reason if flagged or null"}.\n\n` +
    `Title: """${title.slice(0, 200)}"""\nContent: """${content.slice(0, 1000)}"""`;

  return (await runOllamaToxicityCheck(prompt)) ?? (await runClaudeToxicityCheck(prompt, 80));
}
