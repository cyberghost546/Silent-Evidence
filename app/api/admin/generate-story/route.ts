// app/api/admin/generate-story/route.ts
// Admin-only endpoint that uses Claude AI to generate a single complete horror story.
//
// POST /api/admin/generate-story
// Expected request body: { categorySlug, mood, tone, length, seedPrompt }
//
// The admin provides parameters (category, mood, tone, word-count size, and optionally
// a short seed idea).  This endpoint assembles a detailed creative-writing prompt,
// sends it to Claude, parses the returned JSON, and saves the result as a DRAFT story
// attributed to the admin user.  The admin can then review and publish it from the dashboard.
//
// WHY DRAFT NOT PUBLISHED?
//   Unlike batch-generate (which publishes immediately for bulk efficiency), this
//   single-story generator saves as DRAFT so the admin can review, edit, and add
//   a cover image before the story goes live.

// Import NextResponse to build JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie from the request
import { cookies } from 'next/headers';

// Import the Prisma client to write the generated story to the database
import { prisma } from '@/lib/prisma';

// Import the Anthropic SDK — the official library for calling the Claude AI API
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// When OLLAMA_GENERATION=true, story generation uses the local Ollama model instead of Claude.
// This is free and keeps Claude credits for higher-priority features like the chatbot.
const USE_OLLAMA = process.env.OLLAMA_GENERATION === 'true';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';

async function generateStoryText(prompt: string): Promise<string> {
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

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content[0].type === 'text' ? message.content[0].text : '';
}

// ── POST /api/admin/generate-story ───────────────────────────────────────────

// "export async function POST" registers this as Next.js's handler for POST requests.
// "async" allows us to use "await" for database calls and API calls inside the function.
// "req: Request" is the incoming HTTP request object — we read its JSON body for parameters.
export async function POST(req: Request) {
  // ── Auth: must be a logged-in admin ─────────────────────────────────────────

  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Extract the userId cookie and convert it to a number; default to 0 if absent
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If no userId cookie exists, the user is not logged in — return 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Look up the user's role in the database to confirm they are an admin
  // select: { role: true } fetches only the role column — efficient
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // If the user doesn't exist or isn't an ADMIN, return 403 Forbidden
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // ── Parse request body ───────────────────────────────────────────────────────

  // Destructure the five expected fields from the JSON body:
  //   categorySlug — URL slug of the category, e.g. "paranormal"
  //   mood         — emotional tone, e.g. "CREEPY" or "ATMOSPHERIC" (matches Mood enum)
  //   tone         — descriptive style, e.g. "slow-burn", "intense", "psychological"
  //   length       — "short" / "medium" / "long" — mapped to word count ranges below
  //   seedPrompt   — optional: a short idea to inspire the story (can be undefined)
  const { categorySlug, mood, tone, length, seedPrompt } = await req.json();

  // Look up the full category record by slug — we need its name for the prompt
  // and its id to link the story to the category in the database
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });

  // If no category exists with that slug, return 400 Bad Request
  if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 400 });

  // ── Map length option to a word-count range for the AI ───────────────────────

  // Claude works best with specific word-count targets rather than vague labels.
  // The ternary chain converts the three UI options to approximate word ranges:
  //   'short'  → 400-600 words  (quick reads)
  //   'long'   → 1200-1800 words (deep reads)
  //   anything else → 700-1000 words (medium, the default)
  const wordCount = length === 'short' ? '400-600' : length === 'long' ? '1200-1800' : '700-1000';

  // ── Build the creative-writing prompt ────────────────────────────────────────

  // We instruct Claude to return ONLY a JSON object — no markdown code fences,
  // no preamble, no "here is your story" — so we can reliably parse the response.
  // Template literals (backtick strings) let us embed variables with ${...}.
  // The conditional ${seedPrompt ? `- Story seed/inspiration: ${seedPrompt}` : ''} adds
  // the seed line only when the admin provided one; otherwise it's an empty string.
  const prompt = `You are a talented horror and mystery story writer. Write an original, gripping ${category.name.toLowerCase()} story for the "Silent Evidence" community website.

Requirements:
- Category: ${category.name}
- Mood: ${mood || 'any horror mood'}
- Tone: ${tone || 'dark and unsettling'}
- Length: ${wordCount} words
${seedPrompt ? `- Story seed/inspiration: ${seedPrompt}` : ''}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "title": "The story title here",
  "excerpt": "A 1-2 sentence teaser that hooks the reader without spoiling the ending.",
  "content": "The full story HTML here. Use <p> tags for paragraphs. You may use <em> for emphasis."
}

Make the story original, immersive, and genuinely unsettling. End with a memorable twist or haunting final line.`;

  try {
    // Call either Ollama (free, local) or Claude depending on OLLAMA_GENERATION env var
    const rawText = await generateStoryText(prompt);

    // ── Parse JSON from Claude's response ────────────────────────────────────

    // Even though we instructed Claude to return only JSON, it may occasionally
    // wrap it in markdown code fences (```json ... ```) or add extra text.
    // This regex finds the JSON object anywhere in the response:
    //   /\{[\s\S]*\}/ — matches the first { to the last } including newlines
    // This is more robust than JSON.parse(rawText) directly.
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    // If no JSON object was found in the response, something went wrong with Claude
    if (!jsonMatch)
      return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 });

    // JSON.parse() converts the JSON string into a plain JavaScript object
    // Destructure to get the three fields we need from the parsed object
    const { title, excerpt, content } = JSON.parse(jsonMatch[0]);

    // If Claude returned JSON but without a title or content, the response is unusable
    if (!title || !content)
      return NextResponse.json({ error: 'Incomplete AI response.' }, { status: 500 });

    // ── Generate a unique URL slug ────────────────────────────────────────────

    // Convert the AI-generated title into a URL-safe slug:
    //   1. .toLowerCase() — make everything lowercase
    //   2. .replace(/[^a-z0-9]+/g, '-') — replace non-alphanumeric sequences with a hyphen
    //   3. .replace(/^-|-$/g, '') — strip any leading or trailing hyphens
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Date.now() returns the current Unix timestamp in milliseconds.
    // Appending it guarantees uniqueness even if two stories have identical titles.
    const timestamp = Date.now();

    // Final slug: readable-title-1715000000000 (human-readable + unique timestamp)
    const slug = `${baseSlug}-${timestamp}`;

    // ── Save as DRAFT — admin must review before publishing ───────────────────

    // prisma.story.create() inserts a new Story row into the database.
    // status: 'DRAFT' means this story won't appear on the public site yet.
    // authorId: userId links the story to the admin who triggered generation.
    // categoryId: category.id links the story to the chosen category.
    // mood: mood && mood !== 'none' ? mood : undefined
    //   — only set the mood field if the admin chose one;
    //   — 'none' is the UI's "no mood" option value; undefined skips the field in Prisma.
    // language: 'en' marks this as an English story.
    const story = await prisma.story.create({
      data: {
        title,
        slug,
        excerpt: excerpt ?? null, // store null if Claude didn't return an excerpt
        content,
        status: 'DRAFT',
        authorId: userId,
        categoryId: category.id,
        mood: mood && mood !== 'none' ? mood : undefined,
        language: 'en',
      },
    });

    // Return the new story's id, slug, and title so the admin UI can link to it
    return NextResponse.json({ storyId: story.id, slug: story.slug, title: story.title });
  } catch (err: any) {
    // Catch any error from Claude or Prisma and return a 500 Internal Server Error
    // err.message is the human-readable description of what went wrong
    // console.error logs it server-side for debugging without exposing it to the client
    console.error('Story generation error:', err);
    return NextResponse.json({ error: err.message ?? 'Generation failed.' }, { status: 500 });
  }
}
