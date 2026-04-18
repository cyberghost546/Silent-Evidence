'use client';
/**
 * app/history/HistoryClient.tsx
 *
 * WHAT THIS FILE DOES:
 * Renders the user's reading history as either a horizontal list or a 3-column
 * grid. The user can toggle between views using two icon buttons. The chosen
 * view is saved to localStorage so it persists across page reloads and visits.
 *
 * localStorage PATTERN:
 * 1. Default to 'list' in useState — safe for server-side rendering because
 *    localStorage doesn't exist on the server.
 * 2. In useEffect (runs only in the browser), read the saved preference and
 *    update state. This avoids a hydration mismatch.
 * 3. switchView() updates both state and localStorage together.
 *
 * WHY TWO SEPARATE VIEW BLOCKS:
 * Rather than a single component that changes layout based on `view`, we have
 * two completely separate JSX blocks (LIST VIEW / GRID VIEW). This is simpler
 * to read and style than a single block with many conditional class names.
 *
 * HOW TO REUSE:
 * This "persist view preference in localStorage" pattern works for any toggle:
 *   const [view, setView] = useState('list');
 *   useEffect(() => { const s = localStorage.getItem('myKey'); if (s) setView(s); }, []);
 *   const switchView = (v) => { setView(v); localStorage.setItem('myKey', v); };
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { readingTime } from '@/lib/readingTime';

type Story = {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null;
  excerpt: string | null;
  content: string;
  createdAt: string;
  author: { username: string };
  category: { name: string; slug: string };
  _count: { likes: number; comments: number };
};

type HistoryEntry = {
  story: Story;
  readAt: string;
};

export default function HistoryClient({ history }: { history: HistoryEntry[] }) {
  // Default to 'list'; restore from localStorage on mount
  const [view, setView] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const saved = localStorage.getItem('history_view');
    if (saved === 'grid' || saved === 'list') setView(saved);
  }, []);

  const switchView = (v: 'list' | 'grid') => {
    setView(v);
    localStorage.setItem('history_view', v);
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">📖</div>
        <h2 className="text-xl font-semibold text-white mb-2">No history yet</h2>
        <p className="text-gray-500 mb-6">Stories you read will appear here after 10 seconds of reading.</p>
        <Link href="/" className="inline-block bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
          Explore Stories
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header row with count + view toggle ─────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{history.length} {history.length === 1 ? 'story' : 'stories'} read</p>

        {/* List / Grid toggle buttons */}
        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          {/* List view button */}
          <button
            onClick={() => switchView('list')}
            title="List view"
            className={`p-1.5 rounded-md transition ${view === 'list' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Grid view button */}
          <button
            onClick={() => switchView('grid')}
            title="Grid view"
            className={`p-1.5 rounded-md transition ${view === 'grid' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5zM4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── LIST VIEW ────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="flex flex-col gap-4">
          {history.map(({ story, readAt }) => (
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="group flex gap-4 bg-gray-800 border border-gray-700 hover:border-green-600/50 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-green-900/10"
            >
              {/* Thumbnail */}
              <div className="w-28 sm:w-36 flex-shrink-0 h-24 sm:h-28 overflow-hidden">
                {story.coverImage ? (
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 py-3 pr-4 flex flex-col justify-center gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-green-400">{story.category.name}</span>
                  <span className="text-xs text-green-400 font-semibold">✓ Read</span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors leading-snug line-clamp-2">
                  {story.title}
                </h3>
                {story.excerpt && (
                  <p className="text-xs text-gray-500 line-clamp-1">{story.excerpt}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-600 mt-auto">
                  <span>{story.author.username}</span>
                  <span>·</span>
                  <span>{readingTime(story.content)}</span>
                  <span className="ml-auto text-gray-500">
                    Read {new Date(readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── GRID VIEW (3 columns) ─────────────────────────────────── */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {history.map(({ story, readAt }) => (
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="group bg-gray-800 border border-gray-700 hover:border-green-600/50 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-green-900/20 flex flex-col"
            >
              {/* Cover image — fixed height so all cards align */}
              <div className="h-44 overflow-hidden flex-shrink-0 relative">
                {story.coverImage ? (
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                {/* "✓ Read" badge overlaid on the cover */}
                <span className="absolute top-2 right-2 text-xs text-green-400 font-semibold bg-gray-900/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  ✓ Read
                </span>
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-green-400 mb-1">
                  {story.category.name}
                </span>
                <h3 className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors leading-snug line-clamp-2 flex-1">
                  {story.title}
                </h3>
                {story.excerpt && (
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">{story.excerpt}</p>
                )}
                {/* Footer row */}
                <div className="flex items-center justify-between text-xs text-gray-600 mt-3 pt-3 border-t border-gray-700/60">
                  <span>{story.author.username} · {readingTime(story.content)}</span>
                  <span>{new Date(readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
