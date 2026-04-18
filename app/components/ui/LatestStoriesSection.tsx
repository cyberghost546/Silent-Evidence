'use client';
// app/components/ui/LatestStoriesSection.tsx
// Client wrapper for the Latest Stories grid.
// Handles mood pill filtering (fetches from /api/stories?mood=) without a page reload.
// Also renders the CurrentlyReadingBadge on each card.

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import MoodFilter from './MoodFilter';
import CurrentlyReadingBadge from './CurrentlyReadingBadge';
import { readingTime } from '@/lib/readingTime';

// Shape matching the Prisma include used in LatestStories server component
type Story = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  content: string;
  createdAt: string;
  views: number;
  author:   { username: string };
  category: { name: string; slug: string };
  _count:   { likes: number; comments: number };
  mood?: string | null;
};

type Props = {
  initialStories: Story[];
  // Set of story IDs the logged-in user has already read (empty if not logged in)
  readIds: number[];
};

const PAGE_SIZE = 6;

export default function LatestStoriesSection({ initialStories, readIds }: Props) {
  const [activeMood, setActiveMood] = useState('');
  const [stories, setStories]       = useState<Story[]>(initialStories);
  const [loading, setLoading]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(initialStories.length === PAGE_SIZE);
  const skipRef   = useRef(initialStories.length);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const readSet = new Set(readIds);

  // Re-fetch from the top when the mood filter changes
  const fetchStories = useCallback(async (mood: string) => {
    setLoading(true);
    skipRef.current = 0;
    try {
      const qs = mood ? `?mood=${encodeURIComponent(mood)}&take=${PAGE_SIZE}` : `?take=${PAGE_SIZE}`;
      const res = await fetch(`/api/stories${qs}`);
      if (res.ok) {
        const data = await res.json();
        setStories(data);
        setHasMore(data.length === PAGE_SIZE);
        skipRef.current = data.length;
      }
    } catch {
      // keep existing stories on network error
    } finally {
      setLoading(false);
    }
  }, []);

  // Append the next page — triggered by IntersectionObserver hitting the sentinel div
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const moodParam = activeMood ? `&mood=${encodeURIComponent(activeMood)}` : '';
      const qs = `?take=${PAGE_SIZE}&skip=${skipRef.current}${moodParam}`;
      const res = await fetch(`/api/stories${qs}`);
      if (res.ok) {
        const data = await res.json();
        setStories(prev => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        skipRef.current += data.length;
      }
    } catch {
      // silently fail — user can scroll back to retry
    } finally {
      setLoadingMore(false);
    }
  }, [activeMood, hasMore, loadingMore]);

  // Wire up IntersectionObserver to the sentinel div at the bottom of the list
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleMoodChange = (mood: string) => {
    setActiveMood(mood);
    fetchStories(mood);
  };

  return (
    <section>
      {/* Section header + mood filter row */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-1 h-6 bg-red-600 rounded-full" />
            <h2 className="text-2xl font-bold text-white">Latest Stories</h2>
          </div>
          <Link href="/search" className="text-sm text-gray-500 hover:text-red-400 transition flex items-center gap-1">
            View all
            {/* Right chevron icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Mood filter pills — clicking one re-fetches stories with that mood */}
        <MoodFilter activeMood={activeMood} onChange={handleMoodChange} />
      </div>

      {/* Loading skeleton — 6 grey pulse cards while fetching */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-700" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <p className="text-gray-500 text-sm py-10 text-center">No stories found for this mood yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="group bg-gray-800 border border-gray-700 hover:border-red-600/60 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)] flex flex-col"
            >
              {/* Cover image area */}
              <div className="h-44 overflow-hidden relative">
                {/* "Already read" badge for logged-in users */}
                {readSet.has(story.id) && (
                  <span className="absolute top-2 right-2 z-10 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-900/80 text-green-400 border border-green-500/40 backdrop-blur-sm">
                    ✓ Read
                  </span>
                )}
                {story.coverImage ? (
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    loading="lazy"
                    decoding="async"
                    onLoad={e => (e.currentTarget as HTMLImageElement).classList.add('img-loaded')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 img-lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    {/* Placeholder book icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                {/* Dark gradient overlay so category label is readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-800/80 to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-bold uppercase tracking-wider text-red-400">
                  {story.category.name}
                </span>
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors leading-snug line-clamp-2">
                  {story.title}
                </h3>
                {story.excerpt && (
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{story.excerpt}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-auto pt-2 text-xs text-gray-600">
                  <span>{story.author.username}</span>
                  <span className="text-gray-700">·</span>
                  <span>{readingTime(story.content)}</span>
                  <span className="ml-auto">
                    {new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {/* Live reader count — only shows when ≥2 people are reading */}
                  <CurrentlyReadingBadge storyId={story.id} />
                  {/* Like count */}
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                    </svg>
                    {story._count.likes}
                  </span>
                  {/* Comment count */}
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {story._count.comments}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel — IntersectionObserver watches this div */}
      {hasMore && !loading && (
        <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-4">
          {loadingMore && (
            <span className="text-gray-600 text-sm animate-pulse">Loading more…</span>
          )}
        </div>
      )}
    </section>
  );
}
