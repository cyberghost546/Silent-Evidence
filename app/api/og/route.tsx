// app/api/og/route.tsx
// Dynamic Open Graph image generation for story social media previews.
// Creates a dark, horror-themed 1200x630 image with the story title,
// author name, and mood badge — so shared links look compelling on
// Twitter, Facebook, Discord, iMessage, etc.
//
// Usage: /api/og?slug=my-anime-story
// Called automatically by the story page's generateMetadata function.

import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Mood emoji mapping — matches the anime Mood enum values for visual flair on OG cards
const MOOD_EMOJI: Record<string, string> = {
  EPIC: '⚔️',
  HEARTWARMING: '💖',
  MYSTERIOUS: '🔮',
  ACTION: '💥',
  ROMANTIC: '🌸',
  COMEDIC: '😂',
  DRAMATIC: '🎭',
  DARK: '🌑',
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  // Fetch the story details needed for the OG card
  const story = await prisma.story.findUnique({
    where: { slug, status: 'PUBLISHED' },
    select: {
      title: true,
      excerpt: true,
      mood: true,
      author: { select: { username: true } },
      category: { select: { name: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!story) {
    return new Response('Story not found', { status: 404 });
  }

  // Truncate title and excerpt so they fit the card layout without overflow
  const title = story.title.length > 80 ? story.title.slice(0, 77) + '...' : story.title;
  const excerpt = story.excerpt
    ? story.excerpt.length > 120 ? story.excerpt.slice(0, 117) + '...' : story.excerpt
    : 'A horror story on Silent Evidence';
  // Look up the mood emoji for the badge — fall back to empty string if mood not set
  const moodEmoji = story.mood ? MOOD_EMOJI[story.mood] ?? '' : '';
  // Capitalize the mood label for display (e.g. "EPIC" → "Epic")
  const moodLabel = story.mood ? story.mood.charAt(0) + story.mood.slice(1).toLowerCase() : '';

  // Generate the image using Next.js ImageResponse (uses Satori under the hood)
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          // Dark gradient background with a subtle green tint — matches the anime theme
          background: 'linear-gradient(145deg, #0a0a0a 0%, #0f0520 50%, #0a0a0a 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top section — category badge and mood indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Category pill — green accent to match Silent Evidence theme */}
          <div
            style={{
              backgroundColor: 'rgba(124, 58, 237, 0.3)',
              border: '1px solid rgba(124, 58, 237, 0.6)',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '16px',
              color: '#a78bfa',
              fontWeight: 600,
            }}
          >
            {story.category.name}
          </div>

          {/* Mood badge — shows emoji + label if the story has a mood set */}
          {moodLabel && (
            <div
              style={{
                fontSize: '16px',
                color: '#888',
              }}
            >
              {moodEmoji} {moodLabel}
            </div>
          )}
        </div>

        {/* Middle section — title and excerpt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              lineHeight: 1.15,
              // Subtle green text shadow for depth
              textShadow: '0 2px 20px rgba(124, 58, 237, 0.3)',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '22px',
              color: '#999',
              lineHeight: 1.4,
            }}
          >
            {excerpt}
          </div>
        </div>

        {/* Bottom section — author info and site branding */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Author name */}
            <div style={{ fontSize: '18px', color: '#aaa' }}>
              by {story.author.username}
            </div>
            {/* Engagement stats — likes and comments count */}
            <div style={{ fontSize: '16px', color: '#555' }}>
              {story._count.likes} likes · {story._count.comments} comments
            </div>
          </div>

          {/* Site branding — bottom right corner in green accent */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '20px',
              fontWeight: 700,
              color: '#dc2626',
            }}
          >
            Silent Evidence
          </div>
        </div>

        {/* Decorative green gradient line at the bottom — subtle brand accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #dc2626, transparent)',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
