'use client';
// app/trending/TrendingStories.tsx
// Client component that renders trending story cards.
// Each card shows rank badge, cover, score, category, author, and key stats.

import Link from 'next/link';
import { useState } from 'react';
import { Medal, Skull, Flame, Eye, Heart, MessageCircle } from 'lucide-react';

type Author = {
  username: string;
  isVerified: boolean;
  profile: { avatar: string | null } | null;
};

type Category = { name: string; slug: string };

type TrendingStory = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  views: number;
  createdAt: string;
  score: number;
  author: Author;
  category: Category;
  _count: { likes: number; comments: number };
};

type Props = { stories: TrendingStory[] };

// Returns medal color for top 3 ranks
function rankMedalColor(rank: number): string | null {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-gray-300';
  if (rank === 3) return 'text-orange-400';
  return null;
}

// Formats large view counts — e.g. 12400 → "12.4k"
function fmtNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function TrendingStories({ stories }: Props) {
  // Highlight which row the user is hovering on
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {stories.map((story, idx) => {
        const rank = idx + 1;
        const medalColor = rankMedalColor(rank);
        const isHot = story.score > 10; // mark especially popular stories with a flame

        return (
          <Link
            key={story.id}
            href={`/story/${story.slug}`}
            className={`group flex items-center gap-4 rounded-2xl border transition-all duration-200 overflow-hidden ${
              hovered === story.id
                ? 'border-red-600/60 bg-gray-800'
                : 'border-gray-800 bg-gray-900 hover:border-gray-700'
            }`}
            onMouseEnter={() => setHovered(story.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Rank number / medal */}
            <div className="w-14 flex-shrink-0 flex flex-col items-center justify-center py-4 pl-4">
              {medalColor ? (
                <Medal className={`w-6 h-6 ${medalColor}`} />
              ) : (
                <span className="text-2xl font-extrabold text-gray-600 tabular-nums">
                  {rank}
                </span>
              )}
            </div>

            {/* Cover thumbnail — hidden on very small screens */}
            <div className="hidden sm:block w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
              {story.coverImage ? (
                <img
                  src={story.coverImage}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                // Placeholder with gradient when no cover
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <Skull className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0 py-4">
              {/* Category pill + hot badge */}
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/category/${story.category.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-red-400 hover:text-red-300 font-medium transition"
                >
                  {story.category.name}
                </Link>
                {isHot && (
                  <span className="inline-flex items-center gap-1 text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-1.5 py-0.5 rounded-full">
                    <Flame className="w-3 h-3" /> Hot
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-white font-semibold text-sm sm:text-base leading-snug truncate group-hover:text-red-300 transition">
                {story.title}
              </h2>

              {/* Author + stats row */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {/* Author avatar + name */}
                <div className="flex items-center gap-1.5">
                  <img
                    src={
                      story.author.profile?.avatar ??
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=dc2626&color=fff&size=32`
                    }
                    alt={story.author.username}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span className="text-xs text-gray-400">{story.author.username}</span>
                  {story.author.isVerified && (
                    // Blue checkmark for verified authors
                    <svg className="w-3 h-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Separator dot */}
                <span className="w-1 h-1 rounded-full bg-gray-700 flex-shrink-0" />

                {/* Views */}
                <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Eye className="w-3 h-3" /> {fmtNum(story.views)}</span>

                {/* Likes */}
                <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Heart className="w-3 h-3" /> {fmtNum(story._count.likes)}</span>

                {/* Comments */}
                <span className="inline-flex items-center gap-1 text-xs text-gray-500"><MessageCircle className="w-3 h-3" /> {story._count.comments}</span>
              </div>
            </div>

            {/* Score badge — shows velocity on the right */}
            <div className="flex-shrink-0 pr-5 text-right hidden sm:block">
              <div className="text-xs text-gray-600 mb-0.5">score</div>
              <div className="text-lg font-bold text-red-400 tabular-nums">{story.score}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
