// app/api/recommendations/ai/route.ts
// GET — uses Claude AI to generate personalised story recommendations with explanations.
//
// Unlike the basic scoring-based /api/recommendations, this endpoint sends the user's
// reading history and preferences to Claude, which returns:
//   - A ranked list of story IDs from the candidate pool
//   - A short, atmospheric explanation for each pick (e.g. "You lingered on psychological
//     horror — this one hits different.")
//
// Rate: Claude is called at most once per user per 30 minutes (cached in Redis).
// Requires ANTHROPIC_API_KEY to be set. Falls back to basic scoring if not configured.

import { NextResponse }   from 'next/server';
import { cookies }        from 'next/headers';
import Anthropic          from '@anthropic-ai/sdk';
import { prisma }         from '@/lib/prisma';
import { cache, TTL }     from '@/lib/cache';
import { unauthorized, serverError } from '@/lib/apiError';

// Initialise Anthropic client lazily — avoids crashing if key is not set
function getAI(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function GET(req: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized('You must be logged in to get AI recommendations.');

  const { searchParams } = new URL(req.url);
  // Story currently being read — exclude it from results
  const excludeId = Number(searchParams.get('exclude') ?? 0);
  const take = Math.min(Number(searchParams.get('take') ?? 4), 6);

  try {
    // ── Cache key per user — prevent hammering Claude ─────────────────────────
    // AI recommendations are cached 30 minutes per user (they're expensive to generate)
    const cacheKey = `ai-recs:user:${userId}:exc:${excludeId}`;

    const recommendations = await cache(cacheKey, TTL.MEDIUM * 6, async () => {
      // ── Gather user context for Claude ──────────────────────────────────────

      // User's reading history — last 20 stories read
      const history = await prisma.readingHistory.findMany({
        where: { userId },
        orderBy: { readAt: 'desc' },
        take: 20,
        select: {
          story: {
            select: { title: true, mood: true, category: { select: { name: true } } },
          },
        },
      });

      // User's fear moods from their profile
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { fearMoods: true, bio: true },
      });

      // Stories the user has liked — reveals preferences
      const liked = await prisma.like.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { story: { select: { title: true, mood: true } } },
      });

      // Candidate pool — stories the user hasn't read yet
      const readStoryIds = history.map(h => h.story).filter(Boolean);
      const readIds = await prisma.readingHistory.findMany({
        where: { userId },
        select: { storyId: true },
      });
      const excludeIds = readIds.map(r => r.storyId);
      if (excludeId) excludeIds.push(excludeId);

      // Fetch 30 unread stories as candidates for Claude to choose from
      const candidates = await prisma.story.findMany({
        where: {
          status: 'PUBLISHED',
          id: excludeIds.length ? { notIn: excludeIds } : undefined,
        },
        orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
        take: 30,
        select: {
          id: true,
          title: true,
          excerpt: true,
          mood: true,
          category: { select: { name: true } },
          _count: { select: { likes: true } },
        },
      });

      if (candidates.length === 0) return [];

      // ── Build Claude prompt ────────────────────────────────────────────────
      const ai = getAI();

      // If AI is not configured, fall back to simple popularity-based picks
      if (!ai) {
        return candidates.slice(0, take).map(s => ({
          id: s.id,
          title: s.title,
          reason: 'Popular in your preferred genres.',
        }));
      }

      // Summarise the user's reading taste for Claude
      const tasteContext = [
        history.length > 0
          ? `Recently read: ${history.slice(0, 8).map(h => `"${h.story.title}" (${h.story.mood ?? 'unknown mood'})`).join(', ')}`
          : 'No reading history yet.',
        liked.length > 0
          ? `Liked: ${liked.slice(0, 5).map(l => `"${l.story.title}"`).join(', ')}`
          : '',
        profile?.fearMoods
          ? `Fear preferences: ${profile.fearMoods}`
          : '',
      ].filter(Boolean).join('\n');

      // Story candidates formatted for Claude
      const candidateList = candidates
        .map(s => `ID:${s.id} | "${s.title}" | Mood:${s.mood ?? 'none'} | Category:${s.category?.name} | Likes:${s._count.likes} | Excerpt:${s.excerpt?.slice(0, 100) ?? ''}`)
        .join('\n');

      // Ask Claude to pick the best matches and explain why in a horror-appropriate tone
      const message = await ai.messages.create({
        model: 'claude-haiku-4-5-20251001', // Use Haiku for speed and cost efficiency
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `You are a horror story curator for "Silent Evidence", a paranormal fiction community.

A reader's taste:
${tasteContext}

Available stories (pick the best ${take} matches):
${candidateList}

Return ONLY valid JSON — an array of exactly ${take} objects, no extra text:
[{"id": <number>, "reason": "<one atmospheric sentence explaining why this story matches their taste>"}]

Keep reasons under 80 characters. Use dark, atmospheric language that fits a horror platform.`,
          },
        ],
      });

      // ── Parse Claude's response ─────────────────────────────────────────────
      const raw = message.content[0]?.type === 'text' ? message.content[0].text : '[]';

      let picks: Array<{ id: number; reason: string }> = [];
      try {
        // Extract JSON from the response (Claude sometimes wraps in backticks)
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) picks = JSON.parse(jsonMatch[0]);
      } catch {
        // If parsing fails, fall back to the first N candidates
        picks = candidates.slice(0, take).map(s => ({
          id: s.id,
          reason: 'A dark tale that awaits.',
        }));
      }

      // Attach story details to the picks so the frontend doesn't need another fetch
      return picks.map(pick => {
        const story = candidates.find(c => c.id === pick.id);
        return {
          id: pick.id,
          title: story?.title ?? '',
          mood: story?.mood ?? null,
          categoryName: story?.category?.name ?? '',
          reason: pick.reason,
        };
      });
    });

    return NextResponse.json(recommendations);
  } catch (err) {
    console.error('[ai-recommendations]', err);
    return serverError();
  }
}
