'use client';
// app/components/ui/TipLeaderboard.tsx
// Shows the top tipped authors for the current month.
// Fetches from /api/tips/leaderboard on mount.
// Used on the home page sidebar and the /leaderboard page.

import { useEffect, useState } from 'react';
import Link from 'next/link';

type TopAuthor = {
  username: string;
  avatar: string | null;
  isVerified: boolean;
  totalTips: number; // in cents
};

// Formats cents to a dollar string — e.g. 1234 → "$12.34"
function fmtTips(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function TipLeaderboard() {
  const [authors, setAuthors] = useState<TopAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tips/leaderboard')
      .then(r => r.json())
      .then(data => { setAuthors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse space-y-3">
        <div className="h-4 bg-gray-800 rounded w-1/2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0" />
            <div className="flex-1 h-3 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (authors.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Most Tipped This Month
        </h2>
      </div>

      <ol className="space-y-3">
        {authors.map((author, i) => {
          const avatarSrc =
            author.avatar ??
            `https://ui-avatars.com/api/?name=${encodeURIComponent(author.username)}&background=dc2626&color=fff&size=32`;

          return (
            <li key={author.username} className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-sm font-bold text-gray-700 w-5 text-center flex-shrink-0">
                {i + 1}
              </span>

              {/* Avatar */}
              <img
                src={avatarSrc}
                alt={author.username}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />

              {/* Username */}
              <Link
                href={`/user/${author.username}`}
                className="flex-1 min-w-0 text-sm text-white hover:text-red-300 transition truncate font-medium"
              >
                {author.username}
                {author.isVerified && (
                  <svg className="inline w-3 h-3 text-blue-400 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </Link>

              {/* Tip total */}
              <span className="text-xs text-amber-400 font-semibold flex-shrink-0">
                {fmtTips(author.totalTips)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
