'use client';
// app/components/ui/AIRecommendations.tsx
// Displays Claude AI-powered personalised story recommendations.
// Shows a "Chosen for you by AI" section with atmospheric explanations for each pick.
// Fetches from /api/recommendations/ai — requires the user to be logged in.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StoryCardSkeleton } from './Skeleton';

interface AIRecommendation {
  id: number;
  title: string;
  mood: string | null;
  categoryName: string;
  reason: string;  // Claude's atmospheric explanation
  slug?: string;   // Added when we fetch the full story details
}

interface Props {
  // The story to exclude (e.g. the one currently being read)
  excludeId?: number;
  // How many recommendations to show (default 4)
  take?: number;
}

// Maps mood values to color classes for the mood badge
const MOOD_COLORS: Record<string, string> = {
  CREEPY:          'text-green-400 bg-green-500/10 border-green-500/20',
  PARANOID:        'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  DISTURBING:      'text-red-400 bg-red-500/10 border-red-500/20',
  ATMOSPHERIC:     'text-blue-400 bg-blue-500/10 border-blue-500/20',
  PSYCHOLOGICAL:   'text-pink-400 bg-pink-500/10 border-pink-500/20',
  SUPERNATURAL:    'text-teal-400 bg-teal-500/10 border-teal-500/20',
  GORE:            'text-orange-400 bg-orange-500/10 border-orange-500/20',
  JUMPSCARE:       'text-red-300 bg-red-400/10 border-red-400/20',
};

export default function AIRecommendations({ excludeId, take = 4 }: Props) {
  const [recs, setRecs] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Build the query string for the API call
    const params = new URLSearchParams({ take: String(take) });
    if (excludeId) params.set('exclude', String(excludeId));

    fetch(`/api/recommendations/ai?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(data => {
        setRecs(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [excludeId, take]);

  // Don't render anything if there's an error (e.g. not logged in)
  if (error) return null;

  return (
    <section className="py-8">
      {/* Section header with AI indicator */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-6 bg-green-500 rounded-full" />
        <h2 className="text-2xl font-bold text-white">Chosen for You</h2>
        {/* AI badge — lets users know this is AI-curated */}
        <span className="text-xs font-semibold text-green-300 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <span>✦</span> AI Curated
        </span>
      </div>

      {loading ? (
        // Show skeleton cards while loading
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: take }).map((_, i) => (
            <StoryCardSkeleton key={i} />
          ))}
        </div>
      ) : recs.length === 0 ? (
        // Empty state — user may not have enough history yet
        <p className="text-gray-500 text-sm">
          Read a few stories and Claude will curate personalised picks for you.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recs.map(rec => (
            <div
              key={rec.id}
              className="group bg-gray-800 border border-gray-700 hover:border-green-500/40 rounded-xl p-4 transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.10)] hover:shadow-[0_8px_30px_rgba(139,92,246,0.25)]"
            >
              {/* Category + Mood badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {rec.categoryName && (
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {rec.categoryName}
                  </span>
                )}
                {rec.mood && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${MOOD_COLORS[rec.mood] ?? 'text-gray-400 bg-gray-700 border-gray-600'}`}>
                    {rec.mood.charAt(0) + rec.mood.slice(1).toLowerCase()}
                  </span>
                )}
              </div>

              {/* Story title — links to the story page */}
              <Link href={`/story/${rec.id}`} className="block">
                <h3 className="text-sm font-bold text-white group-hover:text-green-300 transition line-clamp-2 mb-2 leading-snug">
                  {rec.title}
                </h3>
              </Link>

              {/* Claude's atmospheric reason for this pick */}
              <p className="text-xs text-gray-500 italic line-clamp-2">
                &ldquo;{rec.reason}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
