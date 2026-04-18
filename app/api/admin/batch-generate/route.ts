/**
 * app/api/admin/batch-generate/route.ts
 * ───────────────────────────────────────
 * PURPOSE:
 *   Admin-only API route that generates multiple AI horror stories for a single
 *   category and streams progress back to the browser in real time using
 *   Server-Sent Events (SSE).
 *
 * WHAT IS SERVER-SENT EVENTS (SSE)?
 *   SSE is a browser API where the server keeps an HTTP connection open and
 *   pushes data chunks (called "events") to the client as they're ready.
 *   It's simpler than WebSockets for one-way server→client streaming.
 *   Each event looks like:  data: {"type":"done","title":"..."}\n\n
 *   The client (BatchClient.tsx) reads these chunks and updates the UI card.
 *
 * HOW IT WORKS:
 *   1. Client POSTs { categorySlug, count } — e.g. generate 18 stories for "paranormal".
 *   2. This handler verifies the admin cookie, finds the category, then opens a
 *      ReadableStream and returns it immediately with SSE headers.
 *   3. Inside the stream, it loops `count` times:
 *      a. Sends a "generating" event so the UI shows a spinner.
 *      b. Calls Claude (via Anthropic SDK) to write the story.
 *      c. Fetches a relevant image from Unsplash.
 *      d. Saves the story to the database as PUBLISHED.
 *      e. Sends a "done" or "error" event.
 *      f. Waits 500ms to avoid hitting rate limits.
 *   4. Sends a "complete" event and closes the stream.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - The ReadableStream + SSE pattern works for any long-running server task
 *     where you want to show progress: file processing, bulk emails, etc.
 *   - The `send()` helper (encodes JSON as an SSE data line) is a clean reusable
 *     utility — copy it into any SSE route.
 *   - The `pickMood(index)` rotation ensures variety without randomness —
 *     useful whenever you want to cycle through options predictably.
 *   - The JSON extraction regex (`rawText.match(/\{[\s\S]*\}/)`) is a robust
 *     way to extract JSON from AI responses that might include extra text.
 */

// Import NextResponse for building standard HTTP responses (used only for error returns before the stream starts)
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie from the incoming request
import { cookies } from 'next/headers';

// Import the Prisma client to query and write to the database
import { prisma } from '@/lib/prisma';

// Import the Anthropic SDK — this is the official client library for the Claude AI API
import Anthropic from '@anthropic-ai/sdk';

// Create one shared Anthropic client instance at module level.
// Re-using a single instance avoids overhead of creating a new connection per request.
// process.env.ANTHROPIC_API_KEY reads the API key from your .env file (never hard-code secrets)
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Image keyword lookup ───────────────────────────────────────────────────────

// Maps each category slug to a list of Unsplash search keywords.
// `fetchUnsplashImage` picks one randomly so each story gets a slightly
// different but thematically appropriate image.
// Record<string, string[]> means "an object whose keys are strings and values are arrays of strings"
const CATEGORY_IMAGES: Record<string, string[]> = {
  // Each slug maps to several related keywords so images vary between stories
  'true-stories':        ['dark true crime','dark street night','urban dark moody','shadowy alley'],
  'paranormal':          ['paranormal fog','dark mist forest','ghost light','mysterious light dark'],
  'urban-legends':       ['dark urban night','abandoned city','night street fog','urban grunge dark'],
  'short-nightmares':    ['dark bedroom horror','nightmare shadow','dark corner shadow','creepy night'],
  'haunted-places':      ['haunted house','abandoned mansion','old house night','creepy building'],
  'ghost-encounters':    ['cemetery fog','graveyard dark','misty cemetery','spooky fog night'],
  'crime-and-mystery':   ['crime scene dark','dark detective','mystery fog','crime night'],
  'missing-persons':     ['missing person','dark empty road','abandoned belongings','dark corridor'],
  'sleep-paralysis':     ['dark bedroom','night terror','shadow bedroom','dark ceiling bedroom'],
  'fantasy':             ['dark forest','misty forest fog','deep forest dark','creepy woods'],
  'night-shift-stories': ['empty office night','night shift security','dark hospital corridor','empty building night'],
  'strange-phone-calls': ['old phone dark','telephone dark','dark phone cord','vintage phone dark'],
  'creature-sightings':  ['creature shadow dark','monster dark','beast shadow','dark forest creature'],
  'abandoned-places':    ['abandoned building','derelict interior','decay dark','ruined building'],
  'psychological':       ['mind shadow dark','mirror dark','psychological dark','shadow face'],
  'supernatural-events': ['lightning dark','supernatural glow','dark sky storm','mystic dark'],
  'creepy-folklore':     ['folklore dark','ancient ritual','dark mythology','creepy tradition'],
  'unsolved-mysteries':  ['mystery dark','unsolved crime','evidence board dark','detective dark'],
};

// All available mood values — these must exactly match the Mood enum in the Prisma schema
// so that when we write a story to the database the value is accepted without error
const MOODS = ['CREEPY','PARANOID','DISTURBING','ATMOSPHERIC','PSYCHOLOGICAL','SUPERNATURAL'];

// ── Helper: pick a mood by index ──────────────────────────────────────────────

// Cycles through the MOODS array using the modulo operator (%).
// "index % MOODS.length" always returns a number between 0 and (MOODS.length - 1),
// so the array index is always valid — no out-of-bounds error possible.
// Example: index=0 → CREEPY, index=1 → PARANOID, index=6 → CREEPY again.
// This gives variety across stories without needing true randomness.
// "index: number" declares the parameter type — TypeScript will error if you pass a string.
// ": string" declares the return type — this function always returns a mood string.
function pickMood(index: number): string {
  // Return the mood at position (index mod length)
  return MOODS[index % MOODS.length];
}

// ── Helper: fetch a themed image from Unsplash ────────────────────────────────

// Retrieves a relevant cover image URL for the given category slug.
// Unsplash's /featured/ URL redirects to a CDN image — we follow the redirect
// and store the final URL so the image always loads (redirect URLs can expire).
// Falls back to a reliable dark placeholder if Unsplash is slow or unavailable.
// "categorySlug: string" — the URL-safe slug of the category, e.g. "paranormal"
// "Promise<string>" — this async function eventually resolves to a URL string
async function fetchUnsplashImage(categorySlug: string): Promise<string> {
  // Get the list of keywords for this category, or use a generic fallback
  const keywords = CATEGORY_IMAGES[categorySlug] ?? ['horror dark'];

  // Pick a random keyword from the list for visual variety between stories
  // Math.random() gives a float between 0 and 1; multiply by length and floor() to get an integer index
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];

  try {
    // Build the Unsplash featured search URL with the keyword URL-encoded
    // encodeURIComponent() converts spaces and special characters to %XX format safe for URLs
    const res = await fetch(
      `https://source.unsplash.com/featured/800x450/?${encodeURIComponent(keyword)}`,
      {
        redirect: 'follow', // automatically follow the redirect to the CDN URL
        // AbortSignal.timeout(8000) cancels the fetch if Unsplash takes longer than 8 seconds
        // This prevents a slow image fetch from blocking the whole story generation
        signal: AbortSignal.timeout(8000),
      }
    );

    // res.url is the final URL after all redirects — this is the permanent CDN image URL
    return res.url;
  } catch {
    // If the fetch fails for any reason (timeout, network error, etc.),
    // return a known-good dark placeholder image that will always load
    return `https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&q=80`;
  }
}

// ── Helper: generate one story via Claude ─────────────────────────────────────

// Builds a detailed creative-writing prompt, sends it to Claude, parses the JSON
// response, and fetches a cover image — returning everything the DB needs.
// "category" — the full category object from the database (id, name, slug)
// "index" — the loop counter; used to vary mood and word-count across stories
// The return type is a Promise resolving to an object with five string fields
async function generateStory(category: { id: number; name: string; slug: string }, index: number): Promise<{
  title: string; excerpt: string; content: string; mood: string; coverImage: string;
}> {
  // Determine the mood for this story by cycling through the MOODS array
  const mood = pickMood(index);

  // Cycle through three word-count ranges to vary story length:
  //   index 0, 3, 6... → short (400-600 words)
  //   index 1, 4, 7... → medium (700-1000 words)
  //   index 2, 5, 8... → long (1000-1400 words)
  // index % 3 gives the remainder when dividing by 3, cycling 0→1→2→0...
  const wordCount = index % 3 === 0 ? '400-600' : index % 3 === 1 ? '700-1000' : '1000-1400';

  // The system prompt instructs Claude to return ONLY valid JSON — no markdown
  // fences or explanation text — so we can parse it directly.
  // Template literals (backtick strings) let us embed variables with ${...}
  const prompt = `You are a horror story writer. Write an original ${category.name.toLowerCase()} horror story.

Requirements:
- Mood: ${mood}
- Length: ${wordCount} words
- Make it genuinely frightening and original
- No clichéd openings like "It was a dark and stormy night"

Respond ONLY with valid JSON (no markdown):
{
  "title": "Story title here",
  "excerpt": "One compelling sentence that hooks the reader without spoiling the ending.",
  "content": "Full story here. Use <p> tags for paragraphs. May use <em> for emphasis."
}`;

  // Call the Claude API using the Anthropic SDK
  // "await" pauses this function until Claude responds
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',    // fastest/cheapest model — good for bulk generation
    max_tokens: 2048,             // maximum number of tokens Claude can return
    messages: [{ role: 'user', content: prompt }], // the conversation: one user message with our prompt
  });

  // message.content is an array of content blocks — we only care about the first text block
  // If the first block is type 'text', get its text; otherwise fall back to empty string
  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Use a regex to find the JSON object anywhere in Claude's response.
  // \{ matches a literal opening brace
  // [\s\S]* matches ANY character (including newlines) zero or more times
  // \} matches a literal closing brace
  // This handles cases where Claude accidentally adds text before or after the JSON
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);

  // If we couldn't find valid JSON in the response, throw an error to trigger the catch block
  if (!jsonMatch) throw new Error('Invalid AI response');

  // JSON.parse() converts the JSON string into a JavaScript object
  // We destructure to get the three fields we need directly
  const { title, excerpt, content } = JSON.parse(jsonMatch[0]);

  // Fetch the cover image — this runs after parsing but could overlap with the DB write
  const coverImage = await fetchUnsplashImage(category.slug);

  // Return the story data as an object matching the function's return type
  // excerpt ?? '' means "use excerpt if it exists, otherwise use empty string"
  return { title, excerpt: excerpt ?? '', content, mood, coverImage };
}

// ── POST /api/admin/batch-generate ────────────────────────────────────────────

// Main route handler — verifies the caller is an admin, then opens an SSE stream
// and generates stories one at a time, pushing progress events to the client.
// "req: Request" is the standard Web API Request object with the JSON body
export async function POST(req: Request) {
  // ── Auth check ───────────────────────────────────────────────────────────────

  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value and convert it to a number (0 if missing)
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // If there is no userId cookie, the user is not logged in — return 401 Unauthorized
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Look up the user in the database to verify their role
  // select: { role: true } means only fetch the role field — we don't need anything else
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // If the user doesn't exist or isn't an ADMIN, return 403 Forbidden
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // ── Parse request body ───────────────────────────────────────────────────────

  // Destructure the two expected fields from the JSON body
  // categorySlug — which category to generate stories for (e.g. "paranormal")
  // count — how many stories to generate; defaults to 18 if not provided
  const { categorySlug, count = 18 } = await req.json();

  // Look up the category by its URL slug — we need its id and name for story creation
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });

  // If the category doesn't exist, return 400 Bad Request
  if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 400 });

  // ── Set up the SSE stream ────────────────────────────────────────────────────

  // TextEncoder converts JavaScript strings into Uint8Array (raw bytes).
  // The browser's streaming fetch reads raw bytes, so we need to encode our strings.
  const encoder = new TextEncoder();

  // ReadableStream is the Web Streams API — natively supported in Next.js.
  // The `start` function runs immediately when the response is returned to the client.
  // `controller` lets us push data into the stream and close it when done.
  const stream = new ReadableStream({
    async start(controller) {
      // `send` is a local helper that formats any object as a Server-Sent Event line.
      // SSE format requires each event to look like:  data: <JSON string>\n\n
      // The double newline (\n\n) signals the end of one event to the browser.
      // `controller.enqueue()` pushes the encoded bytes into the stream for the client to read.
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Running totals updated as each story succeeds or fails
      let generated = 0; // number of stories successfully saved to the database
      let failed = 0;    // number of stories that threw an error

      // Notify the client that we're starting — the UI uses this to initialise its progress bar
      send({ type: 'start', category: category.name, total: count });

      // ── Main generation loop ─────────────────────────────────────────────────

      // Loop `count` times (e.g. 18), generating one story per iteration
      // We do this sequentially (not in parallel) to avoid rate-limit errors from Claude
      for (let i = 0; i < count; i++) {
        try {
          // Notify the client we're about to call Claude for story number i+1
          // i+1 because humans count from 1, not 0
          send({ type: 'generating', index: i + 1, total: count });

          // Call the helper above — this is the slow part (Claude + Unsplash)
          // Destructure all five fields from the returned object
          const { title, excerpt, content, mood, coverImage } = await generateStory(category, i);

          // ── Build a unique URL slug ────────────────────────────────────────────
          // 1. .toLowerCase() — make the title all lowercase
          // 2. .replace(/[^a-z0-9]+/g, '-') — replace anything that isn't a letter or number with a hyphen
          //    [^a-z0-9] means "not a-z or 0-9"; + means "one or more"; g means "all occurrences"
          // 3. .replace(/^-|-$/g, '') — strip any leading or trailing hyphens
          // 4. Append a timestamp (Date.now()) and the loop index to guarantee uniqueness
          //    even if two stories have identical titles
          const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const slug = `${baseSlug}-${Date.now()}-${i}`;

          // ── Save to database ───────────────────────────────────────────────────
          // Create a new Story row — PUBLISHED means it goes live on the site immediately
          // authorId links the story to the admin user who triggered the generation
          // mood: mood as any — "as any" bypasses TypeScript's type check here because
          //   we know the mood string matches the enum, but TypeScript can't verify it from a plain string
          await prisma.story.create({
            data: {
              title,
              slug,
              excerpt: excerpt || null, // save null if excerpt is an empty string
              content,
              coverImage: coverImage || null, // save null if no image URL
              status: 'PUBLISHED',
              authorId: userId,
              categoryId: category.id,
              mood: mood as any,
              language: 'en',
            },
          });

          // Increment the success counter
          generated++;

          // Notify the client that this story is done — the UI shows a checkmark with the title
          send({ type: 'done', index: i + 1, total: count, title, generated, failed });

        } catch (err: any) {
          // One story failed — increment the failure counter but keep going with the rest
          // err.message contains a human-readable description of what went wrong
          failed++;
          send({ type: 'error', index: i + 1, total: count, message: err.message, generated, failed });
        }

        // Wait 500 milliseconds between each story to avoid hitting the Anthropic rate limit.
        // "new Promise(r => setTimeout(r, 500))" creates a promise that resolves after 500ms —
        // "await"-ing it pauses the loop for that duration before the next iteration.
        await new Promise(r => setTimeout(r, 500));
      }

      // ── Close the stream ──────────────────────────────────────────────────────

      // Send a final summary event so the UI can show a completion message
      send({ type: 'complete', generated, failed, category: category.name });

      // Close the stream — the browser's streaming fetch will see this as the end of the response
      controller.close();
    },
  });

  // Return the stream as the HTTP response body.
  // The headers tell the browser this is an SSE connection:
  //   Content-Type: text/event-stream — activates the SSE protocol in the browser
  //   Cache-Control: no-cache         — prevents proxies from buffering events (which would break streaming)
  //   Connection: keep-alive          — keeps the TCP connection open for the duration of the stream
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
