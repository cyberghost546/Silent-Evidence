// app/api/chat/route.ts
// POST — handles the AI chatbot ("The Watcher") powered by Claude.
// Receives the conversation history from the client and streams Claude's reply
// back word-by-word so it appears to type in real time, like ChatGPT.
// Uses the Anthropic SDK's streaming API — no response is held back until the end.

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

// Builds a compact catalogue of real published stories to ground the chatbot, so
// it can recommend ACTUAL stories with working links instead of inventing titles.
// Kept small (a mix of recent and most-read) to bound the token cost per chat.
// Cached briefly in module memory so we do not hit the DB on every message.
let catalogueCache: { text: string; at: number } | null = null;
const CATALOGUE_TTL_MS = 5 * 60 * 1000;

async function storyCatalogue(): Promise<string> {
  if (catalogueCache && Date.now() - catalogueCache.at < CATALOGUE_TTL_MS) {
    return catalogueCache.text;
  }
  try {
    const [recent, popular] = await Promise.all([
      prisma.story.findMany({
        where: { status: 'PUBLISHED', contentRating: { in: ['ALL', 'TEEN'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { title: true, slug: true, mood: true, category: { select: { name: true } } },
      }),
      prisma.story.findMany({
        where: { status: 'PUBLISHED', contentRating: { in: ['ALL', 'TEEN'] } },
        orderBy: { views: 'desc' },
        take: 10,
        select: { title: true, slug: true, mood: true, category: { select: { name: true } } },
      }),
    ]);
    // De-duplicate by slug (a story can be both recent and popular).
    const seen = new Set<string>();
    const rows = [...recent, ...popular].filter((s) => !seen.has(s.slug) && seen.add(s.slug));
    const lines = rows.map(
      (s) =>
        `- "${s.title}" [${s.category?.name ?? 'Story'}${s.mood ? ', ' + s.mood.toLowerCase() : ''}] → /story/${s.slug}`
    );
    const text = lines.length
      ? `\n\nREAL STORIES YOU CAN RECOMMEND (only recommend from this list, always give the /story/... link):\n${lines.join('\n')}`
      : '';
    catalogueCache = { text, at: Date.now() };
    return text;
  } catch {
    return '';
  }
}

// Create one Anthropic client instance — reused for every request.
// The API key is stored in .env as ANTHROPIC_API_KEY (never hardcoded).
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// SYSTEM_PROMPT — this is the "instruction manual" sent to Claude before every conversation.
// It defines The Watcher's personality, what it knows about the site, and one special rule:
// if a user mentions forgetting their password, Claude must include the [FORGOT_PASSWORD] tag
// so the frontend knows to render the password-reset form inline in the chat.
// To change The Watcher's personality or knowledge, edit this string.
const SYSTEM_PROMPT = `You are "The Watcher" — the AI guide of Silent Evidence, a community platform for horror, mystery, and paranormal storytelling. You speak in a slightly eerie but friendly tone, like a wise presence who has witnessed countless terrifying tales.

You help users with:
- Finding horror stories by mood, category, or theme
- Navigating the site (reading, writing, bookmarks, challenges, forums, leaderboard)
- Writing tips for horror and mystery stories
- Information about site features like story challenges, reader squads, the horror map, haunted hour events, and more
- Answering questions about the community
- Password reset: if the user says they forgot their password, cannot log in, or need to reset their password, respond with exactly this tag on its own line: [FORGOT_PASSWORD] — then briefly explain that you'll show them a form to send a reset email.

Categories on the site include: Ghost Stories, Urban Legends, Psychological Horror, Supernatural, Creepypasta, True Crime, Paranormal, Survival Horror, Cosmic Horror, and more.

Site features include: story reading & writing, bookmarks, likes, comments, challenges (writing contests), forums, groups (Horror Squads), the horror map, haunted hour (live events), AI story recommendations, mood filters, leaderboards, dare-a-friend, and user profiles.

Keep your answers concise and atmospheric. If you don't know something specific about the site, suggest they explore or contact support. Never break character — you are The Watcher.`;

// POST handler — called by the ChatBot component every time the user sends a message.
export async function POST(req: NextRequest) {
  // The client sends the full conversation history (all messages so far) on every request.
  // Claude needs the whole history to understand the context of the conversation.
  const ip = getClientIp(req);
  const rl = await checkRateLimit(ip, 'chat', { limit: 20, windowMs: 60 * 1000 });
  if (rl.blocked) {
    return new Response('Too many requests — slow down.', { status: 429 });
  }

  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid messages', { status: 400 });
  }

  // Claude requires the first message to be from 'user' — drop any leading assistant messages
  // (the initial greeting is stored client-side but must not be sent to the API)
  const firstUserIdx = messages.findIndex((m: { role: string }) => m.role === 'user');
  if (firstUserIdx === -1) return new Response('No user message', { status: 400 });
  const apiMessages = messages.slice(firstUserIdx);

  // Ground the reply in the real catalogue so recommendations link to stories
  // that actually exist.
  const systemWithCatalogue = SYSTEM_PROMPT + (await storyCatalogue());

  // TextEncoder converts JavaScript strings into bytes so they can be streamed
  const encoder = new TextEncoder();

  // ReadableStream — a web-standard streaming response.
  // The `start` function runs immediately and pushes chunks to the client as they arrive.
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Ask Claude to stream its response instead of waiting for the full reply.
        // This is what makes the text appear word-by-word in the chat UI.
        const claudeStream = client.messages.stream({
          model: 'claude-opus-4-6',
          max_tokens: 1024, // Maximum reply length in tokens (roughly ~750 words)
          system: systemWithCatalogue,
          messages: apiMessages,
        });

        // Each event from Claude may carry a small chunk of text (a few characters).
        // We forward each chunk to the client immediately so it renders in real time.
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        // If the stream fails partway through, send a thematic error message
        // instead of leaving the chat bubble empty or broken.
        console.error('Chat stream error:', err);
        controller.enqueue(
          encoder.encode('\n\n*The darkness swallowed my words. Please try again.*')
        );
      } finally {
        // Always close the stream — this tells the browser the response is complete.
        controller.close();
      }
    },
  });

  // Return the stream as a plain-text HTTP response.
  // 'Transfer-Encoding: chunked' tells the browser to process each chunk as it arrives.
  // 'Cache-Control: no-cache' ensures browsers never cache the AI response.
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
