// lib/toxicityCheck.ts
// Uses the Anthropic API to check content for hate speech or harassment.
// Returns { flagged: boolean, reason?: string }.
// This is a fast check using Haiku — keep calls lightweight.
// Called server-side from the comments and stories POST routes.

import Anthropic from '@anthropic-ai/sdk';

const ai = new Anthropic();

export async function checkToxicity(text: string): Promise<{ flagged: boolean; reason?: string }> {
  // Skip very short comments — not worth the API call
  if (text.trim().length < 10) return { flagged: false };

  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [
        {
          role: 'user',
          content:
            `You are a content moderator. Does the following comment contain hate speech, harassment, threats, slurs, or targeted abuse? ` +
            `Reply with JSON only: {"flagged": true/false, "reason": "brief reason if flagged or null"}.\n\nComment: """${text.slice(0, 500)}"""`,
        },
      ],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    return {
      flagged: parsed.flagged === true,
      reason: parsed.reason ?? undefined,
    };
  } catch {
    // If the AI call fails, let the comment through rather than blocking all comments
    return { flagged: false };
  }
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
  // Skip if title and content are very short
  if (title.length + content.length < 20) return { flagged: false };

  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content:
            `You are a content moderator for an horror fiction platform. Dark themes (violence, death, conflict) are ALLOWED — this is a creative writing platform. ` +
            `Only flag content that contains REAL-WORLD hate speech targeting real groups, doxxing/personal info, instructions for real violence, CSAM references, or spam/scam links. ` +
            `Do NOT flag fictional violence, dark themes, or intense storytelling. ` +
            `Reply with JSON only: {"flagged": true/false, "reason": "brief reason if flagged or null"}.\n\n` +
            `Title: """${title.slice(0, 200)}"""\nContent: """${content.slice(0, 1000)}"""`,
        },
      ],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    return {
      flagged: parsed.flagged === true,
      reason: parsed.reason ?? undefined,
    };
  } catch {
    // If the AI call fails, let the story through — don't block all publishing
    return { flagged: false };
  }
}
