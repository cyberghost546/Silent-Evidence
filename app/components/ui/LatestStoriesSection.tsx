'use client';
// =============================================================================
// LatestStoriesSection.tsx  —  CLIENT COMPONENT
// =============================================================================
// Purpose:
//   The interactive part of the Latest Stories grid. Receives the first page of
//   stories as a server-rendered prop (initialStories), then handles:
//     1. Mood pill filtering  — re-fetches from /api/stories?mood= on selection
//     2. Infinite scroll      — appends the next page when the sentinel div enters
//                               the viewport (IntersectionObserver)
//     3. "✓ Read" badges      — highlights cards for stories the user has read
//     4. Loading skeletons    — shows grey pulse cards while fetching
//
// Usage:
//   Rendered exclusively by LatestStories.tsx (the server component parent).
//   Do not render LatestStoriesSection directly from page files; use LatestStories
//   so the initial data is server-fetched.
//
// API surface:
//   GET /api/stories?take=N&skip=N&mood=MOOD  → Story[]
//
// Architecture notes:
//   - skipRef is a useRef (not useState) because it must update synchronously
//     inside loadMore without triggering an extra re-render.
//   - loadMore is wrapped in useCallback so the IntersectionObserver useEffect
//     only re-wires when activeMood or hasMore changes (not on every render).
//   - The IntersectionObserver uses rootMargin: '200px' so the next page starts
//     loading before the user actually scrolls to the bottom — reduces perceived latency.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import MoodFilter from './MoodFilter';
import CurrentlyReadingBadge from './CurrentlyReadingBadge';
import { readingTime } from '@/lib/readingTime';

// ── Type definitions ──────────────────────────────────────────────────────────

// Story shape — must match the Prisma include used in LatestStories.tsx.
// All Date fields arrive as ISO strings because the parent serialised them
// via JSON.parse(JSON.stringify(...)).
type Story = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null; // optional short teaser below the title
  coverImage: string | null; // URL to the cover image, or null for the placeholder
  content: string; // full Markdown body — used only for readingTime()
  createdAt: string; // ISO string (was a Date on the server)
  views: number;
  author: { username: string };
  category: { name: string; slug: string };
  _count: { likes: number; comments: number };
  mood?: string | null; // optional mood tag (e.g. 'DARK', 'CREEPY')
};

type Props = {
  initialStories: Story[]; // first page of stories — server-rendered, no loading flash
  readIds: number[]; // story IDs the logged-in user has already read ([] for guests)
};

// PAGE_SIZE must match the `take` parameter used in the server component
// so hasMore is calculated correctly (if data.length === PAGE_SIZE, there may be more).
const PAGE_SIZE = 6;

export default function LatestStoriesSection({ initialStories, readIds }: Props) {
  // ── State ─────────────────────────────────────────────────────────────────

  // The currently active mood filter (empty string = "All" / no filter).
  const [activeMood, setActiveMood] = useState('');

  // The array of story objects currently shown in the grid.
  // Starts with initialStories (server-rendered); replaced on mood change;
  // appended to on infinite scroll load.
  const [stories, setStories] = useState<Story[]>(initialStories);

  // True while the mood-filter refetch is in-flight (shows skeleton grid).
  const [loading, setLoading] = useState(false);

  // True while a "load more" page is being fetched (shows bottom spinner).
  const [loadingMore, setLoadingMore] = useState(false);

  // Whether there are more stories to load.
  // Derived from whether the last API response was a full page of PAGE_SIZE.
  const [hasMore, setHasMore] = useState(initialStories.length === PAGE_SIZE);

  // skipRef tracks how many stories have been loaded so far, used as the
  // pagination offset for the next API call.
  // useRef not useState because updating it during loadMore must NOT trigger a
  // re-render — the observer fires frequently and we only want to re-render
  // when the stories array itself changes.
  const skipRef = useRef(initialStories.length);

  // DOM ref attached to an invisible sentinel <div> at the bottom of the list.
  // IntersectionObserver watches this element to trigger the next page load.
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Convert readIds array to a Set for O(1) membership checks in the render loop.
  // Recreated on each render but readIds is a prop that only changes between pages.
  const readSet = new Set(readIds);

  // ── Fetch stories for a given mood filter ─────────────────────────────────
  // Called when the user clicks a mood pill. Resets the story list and pagination.
  // Wrapped in useCallback because it's referenced in handleMoodChange — no deps
  // that change frequently, so this is stable across renders.
  const fetchStories = useCallback(async (mood: string) => {
    setLoading(true);
    skipRef.current = 0; // reset pagination offset when filter changes

    try {
      // Conditionally include the mood param — omit it for the "All" filter.
      const qs = mood
        ? `?mood=${encodeURIComponent(mood)}&take=${PAGE_SIZE}`
        : `?take=${PAGE_SIZE}`;
      const res = await fetch(`/api/stories${qs}`);
      if (res.ok) {
        const data = await res.json();
        setStories(data); // replace the grid entirely
        setHasMore(data.length === PAGE_SIZE); // infer if more pages exist
        skipRef.current = data.length; // next load starts from here
      }
    } catch {
      // Keep existing stories on network error — better to show stale data
      // than to blank out the grid entirely.
    } finally {
      setLoading(false);
    }
  }, []); // no deps — fetchStories itself doesn't close over any changing values

  // ── Load the next page (infinite scroll) ─────────────────────────────────
  // Appends PAGE_SIZE more stories to the existing list. Called by the
  // IntersectionObserver when the sentinel div enters the viewport.
  const loadMore = useCallback(async () => {
    // Guard: skip if a request is already in-flight or there's nothing more to load.
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      // Preserve the active mood filter when loading additional pages.
      const moodParam = activeMood ? `&mood=${encodeURIComponent(activeMood)}` : '';
      const qs = `?take=${PAGE_SIZE}&skip=${skipRef.current}${moodParam}`;
      const res = await fetch(`/api/stories${qs}`);
      if (res.ok) {
        const data = await res.json();
        // Append to existing list (don't replace).
        setStories((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE); // false if last page was partial
        skipRef.current += data.length; // advance the offset
      }
    } catch {
      // Fail silently — the user can scroll back up and down to retry.
    } finally {
      setLoadingMore(false);
    }
  }, [activeMood, hasMore, loadingMore]);
  // loadMore depends on activeMood (for the query param), hasMore (guard),
  // and loadingMore (guard). The observer is re-wired whenever these change.

  // ── Wire IntersectionObserver to the sentinel div ─────────────────────────
  // The observer fires loadMore() as soon as the sentinel comes within 200px
  // of the viewport bottom — this starts the next fetch before the user
  // actually hits the bottom of the list, making scrolling feel seamless.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // entry.isIntersecting becomes true when the sentinel enters the viewport
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '200px' } // start loading 200px before the element is visible
    );

    observer.observe(el);

    // Cleanup: disconnect the observer when the component unmounts OR when
    // loadMore changes (triggering this effect to re-run with the fresh closure).
    return () => observer.disconnect();
  }, [loadMore]); // re-wire whenever loadMore reference changes

  // ── Mood pill click handler ────────────────────────────────────────────────
  // Updates activeMood state and triggers a new API fetch.
  const handleMoodChange = (mood: string) => {
    setActiveMood(mood);
    fetchStories(mood);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section>
      {/* ── Section header + mood filter row ─────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Red accent bar — matches the section heading style used elsewhere */}
            <span className="w-1 h-6 bg-red-600 rounded-full" />
            <h2 className="text-2xl font-bold text-white">Latest Stories</h2>
          </div>
          {/* "View all" link → /search page which shows all published stories */}
          <Link
            href="/search"
            className="text-sm text-gray-500 hover:text-red-400 transition flex items-center gap-1"
          >
            View all
            {/* Right chevron — purely decorative directional affordance */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Mood filter pill row (controlled component).
            activeMood and onChange are passed down — MoodFilter owns no state.
            Clicking a pill calls handleMoodChange which triggers fetchStories(). */}
        <MoodFilter activeMood={activeMood} onChange={handleMoodChange} />
      </div>

      {/* ── Conditional rendering: loading / empty / grid ─────────────────── */}

      {loading ? (
        // Loading skeleton — 6 pulse cards that mirror the real card layout.
        // Shown while the mood-filter re-fetch is in-flight.
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden animate-pulse"
            >
              {/* Image placeholder */}
              <div className="h-44 bg-gray-700" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        // Empty state — shown when the mood filter returns zero results.
        <p className="text-gray-500 text-sm py-10 text-center">
          No stories found for this mood yet.
        </p>
      ) : (
        // Story grid — responsive: 1 column on mobile, 2 on sm, 3 on lg.
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map((story) => (
            // Each card is a full-bleed <Link> wrapping the card content.
            // group — enables group-hover: utilities on child elements (e.g.
            //   group-hover:scale-105 on the cover image).
            // shadow/hover:shadow — red glow intensifies on hover for drama.
            // flex flex-col — ensures the card body stretches to fill equal heights.
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="group bg-gray-800 border border-gray-700 hover:border-red-600/60 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)] flex flex-col"
            >
              {/* ── Cover image area ────────────────────────────────────── */}
              <div className="h-44 overflow-hidden relative">
                {/* "✓ Read" badge — only shown for stories in the readSet.
                    readSet is derived from the readIds prop (server-fetched).
                    backdrop-blur-sm blurs whatever's behind the badge for legibility. */}
                {readSet.has(story.id) && (
                  <span className="absolute top-2 right-2 z-10 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-900/80 text-green-400 border border-green-500/40 backdrop-blur-sm">
                    ✓ Read
                  </span>
                )}

                {story.coverImage ? (
                  // Cover image with lazy loading + Ken Burns hover zoom.
                  // loading="lazy" defers the image until it's near the viewport.
                  // decoding="async" avoids blocking the main thread during decode.
                  // onLoad adds 'img-loaded' class which triggers a CSS fade-in
                  //   (defined in global.css) so images don't pop in abruptly.
                  // group-hover:scale-105 + transition-transform = Ken Burns effect.
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) =>
                      (e.currentTarget as HTMLImageElement).classList.add('img-loaded')
                    }
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 img-lazy"
                  />
                ) : (
                  // Fallback placeholder — gradient background with a book icon.
                  // Shown when no cover image has been set for this story.
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-10 h-10 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                )}

                {/* Gradient overlay darkens the bottom edge of the image so the
                    category label text is readable on any image colour. */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-800/80 to-transparent" />

                {/* Category label — positioned at the bottom-left of the image area */}
                <span className="absolute bottom-3 left-4 text-xs font-bold uppercase tracking-wider text-red-400">
                  {story.category.name}
                </span>
              </div>

              {/* ── Card body ────────────────────────────────────────────── */}
              {/* flex flex-col gap-2 flex-1 — body expands to fill remaining card
                  height, keeping the metadata row always at the card bottom. */}
              <div className="p-4 flex flex-col gap-2 flex-1">
                {/* Story title — clamp to 2 lines to keep card heights consistent */}
                <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors leading-snug line-clamp-2">
                  {story.title}
                </h3>

                {/* Optional excerpt — shown if the author provided a short summary */}
                {story.excerpt && (
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {story.excerpt}
                  </p>
                )}

                {/* Metadata row — author, reading time, date, reader count, stats */}
                {/* mt-auto pushes this row to the bottom of the flex column */}
                <div className="flex flex-wrap items-center gap-2 mt-auto pt-2 text-xs text-gray-600">
                  <span>{story.author.username}</span>
                  <span className="text-gray-700">·</span>
                  {/* readingTime() calculates an estimated read time from content length */}
                  <span>{readingTime(story.content)}</span>
                  {/* ml-auto pushes the date to the right of the row */}
                  <span className="ml-auto">
                    {new Date(story.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {/* Live reader count — only renders when ≥2 people are currently reading */}
                  <CurrentlyReadingBadge storyId={story.id} />
                  {/* Like count with heart icon */}
                  <span className="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z"
                      />
                    </svg>
                    {story._count.likes}
                  </span>
                  {/* Comment count with speech-bubble icon */}
                  <span className="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    {story._count.comments}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Infinite scroll sentinel ──────────────────────────────────────── */}
      {/*
        This invisible div sits below the grid. The IntersectionObserver (wired
        in the useEffect above) triggers loadMore() when this element scrolls
        within 200px of the viewport.

        Only rendered when hasMore is true and we're not already in a full loading
        state (which shows the skeleton grid instead).

        When loadingMore is true, a small "Loading more…" label appears; otherwise
        the sentinel is a transparent spacer the user never notices.
      */}
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
