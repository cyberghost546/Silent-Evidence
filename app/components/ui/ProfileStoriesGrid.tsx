'use client';
// app/components/ui/ProfileStoriesGrid.tsx
// Renders the story list on a user profile page with a list/grid view toggle.
// State is client-only — the server page passes serialised story data as props.

import { useState } from 'react';
import Link from 'next/link';
import PinStoryButton from './PinStoryButton';

type Story = {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null;
  excerpt: string | null;
  views: number;
  createdAt: string; // ISO string from JSON serialisation
  readTime: string; // pre-computed on the server, e.g. "3 min read"
  category: { name: string; slug: string };
  _count: { likes: number; comments: number };
};

type Props = {
  stories: Story[];
  isOwner: boolean;
  pinnedStoryId: number | null;
  username: string;
};

export default function ProfileStoriesGrid({ stories, isOwner, pinnedStoryId, username }: Props) {
  // 'list' = wide cards with excerpt; 'grid' = compact cover-image grid
  const [view, setView] = useState<'list' | 'grid'>('list');

  if (stories.length === 0) return null;

  return (
    <div>
      {/* ── View toggle ── */}
      <div className="flex items-center justify-end gap-1 mb-4">
        {/* List view button */}
        <button
          onClick={() => setView('list')}
          aria-label="List view"
          className={`p-1.5 rounded-lg border transition ${
            view === 'list'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'border-transparent text-gray-600 hover:text-gray-400'
          }`}
        >
          {/* Horizontal lines icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Grid view button */}
        <button
          onClick={() => setView('grid')}
          aria-label="Grid view"
          className={`p-1.5 rounded-lg border transition ${
            view === 'grid'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'border-transparent text-gray-600 hover:text-gray-400'
          }`}
        >
          {/* 2×2 grid icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
        </button>
      </div>

      {/* ── List view ── */}
      {view === 'list' && (
        <div className="flex flex-col gap-3">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="group flex gap-4 bg-gray-800/60 border border-gray-700/60 hover:border-red-600/40 hover:bg-gray-800 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-[0_4px_20px_rgba(220,38,38,0.12)]"
            >
              {/* Cover thumbnail */}
              {story.coverImage ? (
                <img
                  src={story.coverImage}
                  alt={story.title}
                  className="w-32 h-24 object-cover rounded-xl flex-shrink-0"
                />
              ) : (
                <div className="w-32 h-24 bg-gray-700/50 rounded-xl flex-shrink-0 flex items-center justify-center border border-gray-700"></div>
              )}

              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-red-400">
                    {story.category.name}
                  </span>
                  <h3 className="text-base font-semibold text-white group-hover:text-red-300 transition mt-0.5 line-clamp-1 leading-snug">
                    {story.title}
                  </h3>
                  {story.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                      {story.excerpt}
                    </p>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-2">
                  <span>
                    {new Date(story.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-gray-700">·</span>
                  <span>{story.readTime}</span>
                  <span className="text-gray-700">·</span>
                  <span>{story.views.toLocaleString()}</span>
                  <span className="text-red-500/70">{story._count.likes}</span>
                  <span>{story._count.comments}</span>
                  {/* Pin button visible only to the profile owner */}
                  {isOwner && (
                    <PinStoryButton storyId={story.id} isPinned={pinnedStoryId === story.id} />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Grid view ── */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="group bg-gray-800/60 border border-gray-700/60 hover:border-red-600/40 hover:bg-gray-800 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-[0_4px_20px_rgba(220,38,38,0.15)]"
            >
              {/* Cover image — taller in grid mode */}
              <div className="h-36 overflow-hidden">
                {story.coverImage ? (
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700/60 to-gray-900 flex items-center justify-center"></div>
                )}
              </div>

              <div className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                  {story.category.name}
                </span>
                <h3 className="text-sm font-semibold text-white group-hover:text-red-300 transition mt-0.5 line-clamp-2 leading-snug">
                  {story.title}
                </h3>

                {/* Compact stats */}
                <div className="flex items-center gap-2.5 text-[11px] text-gray-600 mt-2">
                  <span>{story.views.toLocaleString()}</span>
                  <span className="text-red-500/70">{story._count.likes}</span>
                  <span>{story._count.comments}</span>
                  {/* Pin button in grid mode — stop propagation is handled inside PinStoryButton */}
                  {isOwner && (
                    <span className="ml-auto">
                      <PinStoryButton storyId={story.id} isPinned={pinnedStoryId === story.id} />
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
