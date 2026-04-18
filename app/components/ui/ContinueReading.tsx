'use client';
// app/components/ui/ContinueReading.tsx
// Shows the last 3 stories a user was mid-way through, pulled from localStorage.
// ReadingProgress stores "reading-progress-{id}" → percentage as a string.
// We fetch story details from /api/stories/{id} to show title + cover image.
// Returns null server-side (no localStorage) and fades in once hydrated.

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ResumeStory = {
  id: number;
  slug: string;
  title: string;
  coverImage: string | null;
  progress: number; // 0–100
};

export default function ContinueReading() {
  const [stories, setStories] = useState<ResumeStory[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const MAX = 3;
    // Collect all "reading-progress-*" keys from localStorage
    const entries: { id: number; progress: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('reading-progress-')) continue;
      const id = Number(key.replace('reading-progress-', ''));
      const pct = parseFloat(localStorage.getItem(key) ?? '0');
      if (Number.isFinite(id) && pct > 2 && pct < 98) {
        entries.push({ id, progress: pct });
      }
    }
    if (entries.length === 0) { setReady(true); return; }

    // Sort by most-recently-read — use the raw % as a proxy (higher = further = newer)
    // Actually sort by id descending as a simple heuristic (larger IDs = newer stories)
    entries.sort((a, b) => b.id - a.id);
    const top = entries.slice(0, MAX);

    // Fetch story details for each
    Promise.all(
      top.map(({ id, progress }) =>
        fetch(`/api/stories/${id}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data) return null;
            return { id, slug: data.slug, title: data.title, coverImage: data.coverImage ?? null, progress } as ResumeStory;
          })
          .catch(() => null)
      )
    ).then(results => {
      setStories(results.filter((s): s is ResumeStory => s !== null));
      setReady(true);
    });
  }, []);

  if (!ready || stories.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-1 h-5 bg-red-600 rounded-full" />
        <h2 className="text-lg font-bold text-white">Continue Reading</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.map(story => (
          <Link
            key={story.id}
            href={`/story/${story.slug}`}
            className="group relative bg-gray-800 border border-gray-700 hover:border-red-600/60 rounded-xl overflow-hidden transition-all duration-300 flex items-center gap-3 p-3"
          >
            {/* Thumbnail */}
            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-700">
              {story.coverImage ? (
                <img src={story.coverImage} alt={story.title} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title + progress */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-red-300 transition line-clamp-2 leading-snug">
                {story.title}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {/* Progress bar */}
                <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-[width]"
                    style={{ width: `${Math.round(story.progress)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 shrink-0">{Math.round(story.progress)}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
