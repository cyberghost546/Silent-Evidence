'use client';
// app/components/ui/FollowSuggestions.tsx
// Displays a horizontal scrollable row of author cards with follow buttons.
// Used on the home page sidebar and the /explore page.
// Fetches suggestions from /api/suggestions on mount.

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Suggestion = {
  id: number;
  username: string;
  isVerified: boolean;
  profile: { avatar: string | null; bio: string | null } | null;
  _count: { followers: number; stories: number };
};

export default function FollowSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/suggestions')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setSuggestions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Toggle follow state for a suggested author
  const toggleFollow = async (targetId: number) => {
    // Optimistically update the UI before the API call resolves
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });

    await fetch('/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followingId: targetId }),
    }).catch(() => {
      // Revert on error
      setFollowed((prev) => {
        const next = new Set(prev);
        if (next.has(targetId)) next.delete(targetId);
        else next.add(targetId);
        return next;
      });
    });
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-44 h-52 bg-gray-800 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) return null; // silently hide — not critical enough to show an error to users
  if (suggestions.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Authors to Follow
      </h2>
      {/* Horizontally scrollable author cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {suggestions.map((author) => {
          const isFollowed = followed.has(author.id);
          const avatarSrc =
            author.profile?.avatar ??
            `https://ui-avatars.com/api/?name=${encodeURIComponent(author.username)}&background=dc2626&color=fff&size=64`;

          return (
            <div
              key={author.id}
              className="flex-shrink-0 w-44 bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-3"
            >
              {/* Avatar */}
              <Link href={`/user/${author.username}`}>
                <img
                  src={avatarSrc}
                  alt={author.username}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-700 hover:ring-red-600 transition"
                />
              </Link>

              {/* Username + verified badge */}
              <div className="text-center">
                <Link
                  href={`/user/${author.username}`}
                  className="text-sm font-semibold text-white hover:text-red-300 transition flex items-center justify-center gap-1"
                >
                  {author.username}
                  {author.isVerified && (
                    <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">
                  {author._count.stories} {author._count.stories === 1 ? 'story' : 'stories'}
                </p>
              </div>

              {/* Bio excerpt */}
              {author.profile?.bio && (
                <p className="text-xs text-gray-500 text-center line-clamp-2">
                  {author.profile.bio}
                </p>
              )}

              {/* Follow / Following button */}
              <button
                onClick={() => toggleFollow(author.id)}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold transition ${
                  isFollowed
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isFollowed ? 'Following ✓' : 'Follow'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
