// lib/moodDetect.ts
// Uses Ollama (llama3.2:3b) to detect the mood of a story from its title and excerpt.
// Falls back to null if Ollama is unreachable — never blocks story publishing.
// Called from the stories POST route when a story is published without a mood set.

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    ?? 'llama3.2:3b';

// Valid mood values matching the Prisma Mood enum
const VALID_MOODS = [
  'ATMOSPHERIC', 'CREEPY', 'GORE', 'PSYCHOLOGICAL',
  'SUSPENSEFUL', 'SUPERNATURAL', 'DARK', 'UNSETTLING',
] as const;

type Mood = typeof VALID_MOODS[number];

/**
 * detectMood — asks Ollama to classify the mood of a story.
 *
 * @param title   - Story title
 * @param excerpt - Short excerpt or first ~500 chars of content
 * @returns One of the valid Mood enum values, or null if detection fails
 */
export async function detectMood(title: string, excerpt: string): Promise<Mood | null> {
  if (!process.env.OLLAMA_BASE_URL) return null;

  const prompt =
    `You are a horror fiction classifier. Given the story title and excerpt below, ` +
    `choose the single best mood label from this list: ${VALID_MOODS.join(', ')}.\n` +
    `Reply with ONLY the mood label — no punctuation, no explanation.\n\n` +
    `Title: "${title}"\nExcerpt: "${excerpt.slice(0, 500)}"`;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(8000), // don't wait more than 8 s
    });

    if (!res.ok) return null;

    const data = await res.json();
    const raw = (data.response ?? '').trim().toUpperCase().replace(/[^A-Z_]/g, '');

    return (VALID_MOODS as readonly string[]).includes(raw) ? (raw as Mood) : null;
  } catch {
    return null;
  }
}
