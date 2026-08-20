'use client';
// app/components/ui/FollowingFeedClient.tsx
// Paginated story feed showing posts from authors the current user follows.
// Uses an IntersectionObserver sentinel div to auto-load more stories as the user scrolls
// (infinite scroll) instead of a "Load More" button.
// Fetches from GET /api/following/feed?take=12&skip=N.
// Props: isLoggedIn — passed from the server component so we can show a login prompt client-side.

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { readingTime } from '@/lib/readingTime';

type Story = {
  id: number; slug: string; title: string; excerpt: string | null;
  coverImage: string | null; content: string; createdAt: string;
  views: number; mood: string | null;
  author:   { username: string; profile: { avatar: string | null } | null };
  category: { name: string; slug: string };
  _count:   { likes: number; comments: number };
};

const PAGE_SIZE = 12;

export default function FollowingFeedClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [stories, setStories]         = useState<Story[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [isEmpty, setIsEmpty]         = useState(false);
  const skipRef     = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchStories = useCallback(async (skip: number, append: boolean) => {
    try {
      const res = await fetch(`/api/following/feed?take=${PAGE_SIZE}&skip=${skip}`);
      if (res.status === 401) { setIsEmpty(true); return; }
      const data = await res.json();
      const batch: Story[] = data.stories ?? [];
      if (append) setStories(prev => [...prev, ...batch]);
      else { setStories(batch); setIsEmpty(batch.length === 0 && (data.followedIds?.length ?? 0) === 0); }
      setHasMore(batch.length === PAGE_SIZE);
      skipRef.current = skip + batch.length;
    } catch { /* keep existing */ }
  }, []);

  useEffect(() => {
    fetchStories(0, false).finally(() => setLoading(false));
  }, [fetchStories]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchStories(skipRef.current, true);
    setLoadingMore(false);
  }, [fetchStories, hasMore, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-1 h-7 bg-red-600 rounded-full" />
        <h1 className="text-2xl font-bold text-white">Following</h1>
      </div>

      {!isLoggedIn && (
        <div className="text-center py-20">
          <p className="text-white font-semibold mb-2">You need to be logged in</p>
          <Link href="/login" className="text-sm text-red-400 hover:text-red-300 transition">Sign in →</Link>
        </div>
      )}

      {isLoggedIn && loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-700" />
              <div className="p-4 space-y-2"><div className="h-3 bg-gray-700 rounded w-3/4" /><div className="h-3 bg-gray-700 rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      )}

      {isLoggedIn && !loading && isEmpty && (
        <div className="text-center py-20">
          <p className="text-white font-semibold mb-2">Nothing here yet</p>
          <p className="text-gray-500 text-sm mb-6">Follow some authors to see their stories here.</p>
          <Link href="/search" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition">
            Discover Authors
          </Link>
        </div>
      )}

      {isLoggedIn && !loading && stories.length === 0 && !isEmpty && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">The authors you follow haven&apos;t published anything yet.</p>
        </div>
      )}

      {stories.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map(story => {
            const avatarUrl = story.author.profile?.avatar ?? null;
            return (
              <Link key={story.id} href={`/story/${story.slug}`}
                className="group bg-gray-800 border border-gray-700 hover:border-red-600/60 rounded-xl overflow-hidden transition-all duration-300 flex flex-col">
                <div className="h-44 overflow-hidden relative">
                  {story.coverImage ? (
                    <Image src={story.coverImage} alt={story.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-gray-800/80 to-transparent" />
                  <span className="absolute bottom-3 left-4 text-xs font-bold uppercase tracking-wider text-red-400">{story.category.name}</span>
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors leading-snug line-clamp-2">{story.title}</h3>
                  {story.excerpt && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{story.excerpt}</p>}
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={story.author.username} width={20} height={20} className="w-5 h-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-red-700 flex items-center justify-center text-white font-bold shrink-0 text-[9px]">
                        {story.author.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-500">{story.author.username}</span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-xs text-gray-600">{readingTime(story.content)}</span>
                    <span className="ml-auto text-xs text-gray-700">{new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {hasMore && !loading && (
        <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-6">
          {loadingMore && <span className="text-gray-600 text-sm animate-pulse">Loading more…</span>}
        </div>
      )}
    </div>
  );
}
