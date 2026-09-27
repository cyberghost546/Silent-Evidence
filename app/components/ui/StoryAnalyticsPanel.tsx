'use client';
// StoryAnalyticsPanel.tsx
// Shows a stats dashboard on the story edit page.
// Displays views, likes, comments, bookmarks, reactions, and reading time.
// All data is passed as props from the server — no client-side fetching needed.

import {
  Eye,
  Heart,
  MessageSquare,
  Bookmark,
  Flame,
  Smile,
  Zap,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

type Props = {
  views: number;
  likes: number;
  comments: number;
  bookmarks: number;
  reactions: { type: string; count: number }[];
  readingTime: string; // e.g. "4 min read"
  createdAt: string;
  updatedAt: string;
};

// Icon for each reaction type
const reactionEmoji: Record<string, LucideIcon> = {
  LOVE: Heart,
  HYPE: Flame,
  KAWAII: Smile,
  FIRE: Zap,
};

export default function StoryAnalyticsPanel({
  views,
  likes,
  comments,
  bookmarks,
  reactions,
  readingTime,
  createdAt,
  updatedAt,
}: Props) {
  // Calculate engagement rate: (likes + comments) / views as a percentage
  const engagementRate = views > 0 ? (((likes + comments) / views) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-[0_4px_20px_rgba(220,38,38,0.1)]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-white">Story Analytics</h3>
      </div>

      {/* Main stat grid — 4 key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Views', value: views.toLocaleString(), icon: Eye, color: 'text-blue-400' },
          { label: 'Likes', value: likes.toLocaleString(), icon: Heart, color: 'text-red-400' },
          {
            label: 'Comments',
            value: comments.toLocaleString(),
            icon: MessageSquare,
            color: 'text-green-400',
          },
          {
            label: 'Bookmarks',
            value: bookmarks.toLocaleString(),
            icon: Bookmark,
            color: 'text-yellow-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700"
          >
            <Icon className="w-6 h-6" strokeWidth={1.5} aria-hidden="true" />
            <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Engagement rate bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400 font-medium">Engagement Rate</span>
          <span className="text-xs font-bold text-white">{engagementRate}%</span>
        </div>
        {/* Progress bar — capped at 100% width */}
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(parseFloat(engagementRate), 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-600 mt-1">(likes + comments) ÷ views</p>
      </div>

      {/* Reactions breakdown */}
      {reactions.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Reactions</p>
          <div className="flex flex-wrap gap-3">
            {reactions.map((r) => (
              <div
                key={r.type}
                className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                {(() => {
                  const RIcon = reactionEmoji[r.type] ?? HelpCircle;
                  return <RIcon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />;
                })()}
                <div>
                  <p className="text-sm font-bold text-white">{r.count}</p>
                  <p className="text-[10px] text-gray-500">
                    {r.type.charAt(0) + r.type.slice(1).toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 border-t border-gray-800 pt-4">
        <span>{readingTime}</span>
        <span>
          Published{' '}
          {new Date(createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <span>
          Last edited{' '}
          {new Date(updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}
