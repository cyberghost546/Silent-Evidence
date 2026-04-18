'use client';
// app/components/ui/ScareScoreBadge.tsx
// Displays the AI scare score for a horror story as a star rating out of 10.
// If the viewer is the author and no score exists yet, shows a button to
// request an AI evaluation via POST /api/stories/[id]/scare-score.

import { useState } from 'react';

// Props — input configuration for the HypeScoreBadge component
type Props = {
  storyId:      number;       // database ID of the story
  isAuthor:     boolean;      // true if the current viewer wrote this story
  initialScore: number | null; // score already in DB (null = not rated yet)
  initialReason?: string | null; // reason already in DB (null = not rated yet)
};

// TOTAL_STARS — the scale is always shown out of 10 stars
const TOTAL_STARS = 10;

// renderStars — builds a row of filled (⭐) + empty/faded (☆) star icons.
// Filled stars indicate the score; faded stars fill the remainder.
function renderStars(score: number) {
  return Array.from({ length: TOTAL_STARS }, (_, i) => (
    <span
      key={i}
      // Filled stars are fully opaque; empty stars are faded
      className={i < score ? 'opacity-100' : 'opacity-20'}
      aria-hidden="true"
    >
      {/* Show a filled star for scored positions, empty star for the rest */}
      {i < score ? '⭐' : '☆'}
    </span>
  ));
}

// HypeScoreBadge — main exported component that shows or requests an AI hype score
export default function HypeScoreBadge({
  storyId,
  isAuthor,
  initialScore,
  initialReason = null,
}: Props) {
  // score — current hype score (starts from DB value, updated after AI call)
  const [score,   setScore]   = useState<number | null>(initialScore);
  // reason — one-sentence AI explanation of the score
  const [reason,  setReason]  = useState<string | null>(initialReason);
  // loading — true while the POST request to the AI is in-flight
  const [loading, setLoading] = useState(false);
  // error — shown if the AI call fails
  const [error,   setError]   = useState<string | null>(null);

  // requestScore — calls the POST endpoint to trigger an AI evaluation
  async function requestScore() {
    setLoading(true);
    setError(null);

    try {
      // POST to the scare-score API route (route file unchanged for now)
      const res = await fetch(`/api/stories/${storyId}/scare-score`, {
        method: 'POST',
      });

      if (!res.ok) {
        // Try to extract a useful error message from the response body
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to get hype score.');
      }

      // Parse the score and reason from the successful response
      const data = await res.json() as { score: number; reason: string };
      setScore(data.score);
      setReason(data.reason);
    } catch (err: unknown) {
      // Surface the error message, or a generic fallback
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // -- Case 1: No score yet --------------------------------------------------
  if (score === null) {
    // Non-authors just see nothing — the badge only shows once rated
    if (!isAuthor) return null;

    return (
      <div className="flex flex-col gap-2">
        {/* Author-only CTA button to run the AI hype scorer */}
        <button
          onClick={requestScore}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-900/40 hover:bg-green-900/60 border border-green-700/50 text-green-300 hover:text-green-200 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Get AI hype score"
        >
          {loading ? (
            // Spinner animation while the request is in-flight
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            // Default button label with star emoji
            <>⭐ Get AI Hype Score</>
          )}
        </button>

        {/* Error message displayed if the API call failed */}
        {error && (
          <p className="text-xs text-green-400">{error}</p>
        )}
      </div>
    );
  }

  // -- Case 2: Score exists — show the star rating ----------------------------
  return (
    <div className="flex flex-col gap-1.5">
      {/* Star row label showing "Hype Score" and the numeric value */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Hype Score
        </span>
        <span className="text-xs text-gray-600">
          {/* Numeric display: e.g. "7 / 10" */}
          {score} / {TOTAL_STARS}
        </span>
      </div>

      {/* The star icons — filled up to the score, faded for the rest */}
      <div className="flex gap-0.5 text-lg leading-none" role="img" aria-label={`Hype score: ${score} out of ${TOTAL_STARS}`}>
        {renderStars(score)}
      </div>

      {/* AI reason — the one-sentence explanation of the hype score */}
      {reason && (
        <p className="text-xs text-gray-500 italic mt-0.5 max-w-sm">
          {reason}
        </p>
      )}

      {/* Author can re-run the scorer to refresh the hype score */}
      {isAuthor && (
        <button
          onClick={requestScore}
          disabled={loading}
          className="text-xs text-gray-600 hover:text-gray-400 underline underline-offset-2 transition disabled:opacity-40 self-start mt-0.5"
          aria-label="Re-run AI hype score"
        >
          {/* Toggle between loading text and re-score label */}
          {loading ? 'Analyzing...' : 'Re-score'}
        </button>
      )}

      {/* Error shown if a re-score attempt fails */}
      {error && (
        <p className="text-xs text-green-400">{error}</p>
      )}
    </div>
  );
}
