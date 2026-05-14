// app/api/ollama/chat/route.ts
// POST — handles AI chatbot ("The Watcher") powered by Ollama (llama3.2:3b).
// Connects to a self-hosted Ollama server and streams the reply back in real time.
// Set OLLAMA_BASE_URL in your .env to point to your Ollama server.

import { NextRequest } from 'next/server';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';

// Same personality prompt used by the Claude chatbot so behavior is consistent.
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

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid messages', { status: 400 });
  }

  const firstUserIdx = messages.findIndex((m: { role: string }) => m.role === 'user');
  if (firstUserIdx === -1) return new Response('No user message', { status: 400 });

  // Prepend the system message for Ollama's chat format
  const ollamaMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.slice(firstUserIdx).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: ollamaMessages,
            stream: true,
          }),
        });

        if (!ollamaRes.ok || !ollamaRes.body) {
          throw new Error(`Ollama returned ${ollamaRes.status}`);
        }

        // Ollama streams NDJSON — each line is a JSON object with a message delta
        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              const chunk = json?.message?.content;
              if (chunk) {
                controller.enqueue(encoder.encode(chunk));
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      } catch (err) {
        console.error('Ollama stream error:', err);
        controller.enqueue(
          encoder.encode('\n\n*The darkness swallowed my words. Please try again.*')
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
