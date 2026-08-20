// app/widget/page.tsx
// Minimal story-of-the-day widget page — designed to be embedded
// in a phone home screen widget via a WebView shortcut.
// Loads fast, no nav, no heavy JS. Just the daily story card.
// On iOS: use Widgetkit → WebView widget pointing to /widget
// On Android: use KWGT or a bookmark widget pointing to /widget

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { moodIcon } from '@/lib/moodIcons';

// Revalidate once per hour so the widget refreshes automatically
export const revalidate = 3600;

// Mood icons come from the shared lib/moodIcons map.

export default async function WidgetPage() {
  // Pick today's story using a day-of-year offset
  const now       = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );

  const total = await prisma.story.count({ where: { status: 'PUBLISHED' } });
  const story = total > 0
    ? await prisma.story.findFirst({
        where:   { status: 'PUBLISHED', contentRating: 'ALL' },
        orderBy: { createdAt: 'asc' },
        skip:    dayOfYear % total,
        select: {
          title:   true,
          slug:    true,
          excerpt: true,
          mood:    true,
          author:  { select: { username: true } },
        },
      })
    : null;

  return (
    // Minimal layout — no header/footer, dark background to match phone wallpapers
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {story ? (
        // Story card — tapping the whole card takes you to the story
        <Link
          href={`/story/${story.slug}`}
          className="block w-full max-w-xs bg-gray-900 border border-gray-800 rounded-2xl p-5 text-white shadow-2xl"
        >
          {/* Widget header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-500 text-xs font-bold uppercase tracking-widest">
 Story of the Day
            </span>
          </div>

          {/* Mood icon + title */}
          <div className="flex items-start gap-2 mb-2">
            {story.mood && (() => {
              const MoodIcon = moodIcon(story.mood);
              return <MoodIcon className="w-6 h-6 shrink-0 mt-0.5 text-gray-400" strokeWidth={1.5} aria-hidden="true" />;
            })()}
            <h2 className="text-base font-bold leading-snug">{story.title}</h2>
          </div>

          {/* Excerpt preview */}
          {story.excerpt && (
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 mb-3">
              {story.excerpt}
            </p>
          )}

          {/* Author + tap prompt */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>by {story.author.username}</span>
            <span>Tap to read →</span>
          </div>
        </Link>
      ) : (
        // Empty state if no stories exist yet
        <div className="text-center text-gray-600">
          <p className="text-sm">No stories yet.</p>
        </div>
      )}
    </div>
  );
}
