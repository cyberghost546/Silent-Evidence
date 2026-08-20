'use client';
/**
 * ScareOMeter.tsx
 *
 * WHAT THIS FILE DOES:
 * A 5-skull interactive rating widget that lets logged-in readers rate how
 * scary a story is. Hovering over a skull previews that rating; clicking
 * submits it to the server. The current average score and total vote count
 * are fetched on mount and updated after every vote.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Replace the skull emoji (💀) with whatever icon suits your rating system.
 * 2. Change `[1, 2, 3, 4, 5]` to a different scale (e.g. [1,2,3] for 3 stars).
 * 3. Point the fetch calls at your own rating API endpoint.
 * 4. Drop <ScareOMeter storyId={id} isLoggedIn={!!user} /> on any detail page.
 *
 * Example usage:
 *   <ScareOMeter storyId={42} isLoggedIn={true} />
 */

import { useState, useEffect } from 'react';
import { Skull } from 'lucide-react';

// Props: which story to rate, and whether the visitor is logged in.
type Props = { storyId: number; isLoggedIn: boolean };

export default function ScareOMeter({ storyId, isLoggedIn }: Props) {
  // avg — the community's current average rating (0–5), shown next to the skulls
  const [avg, setAvg]             = useState(0);

  // count — total number of votes cast on this story
  const [count, setCount]         = useState(0);

  // userRating — the current user's own submitted rating (null if they haven't rated)
  const [userRating, setUserRating] = useState<number | null>(null);

  // hover — which skull the user is hovering over (0 = not hovering).
  // This gives an instant preview of what the rating will look like before clicking.
  const [hover, setHover]         = useState(0);

  // loading — prevents submitting two votes at the same time
  const [loading, setLoading]     = useState(false);

  // ── Fetch initial rating data on mount ────────────────────────────────────
  // This runs once when the component first renders (empty dependency array [storyId]
  // means re-run if the user navigates to a different story).
  useEffect(() => {
    fetch(`/api/scare-rating?storyId=${storyId}`)
      .then(r => r.json())
      .then(d => {
        setAvg(d.avg);              // community average e.g. 3.7
        setCount(d.count);          // total vote count
        setUserRating(d.userRating); // null or the user's own past vote (1–5)
      });
  }, [storyId]);

  // ── rate — submits a vote ────────────────────────────────────────────────
  const rate = async (rating: number) => {
    // Block if user isn't logged in or a request is already in-flight
    if (!isLoggedIn || loading) return;
    setLoading(true);

    const res = await fetch('/api/scare-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, rating }),
    });

    const data = await res.json();

    // On success, update all three numbers from the server's fresh calculation
    if (res.ok) {
      setAvg(data.avg);
      setCount(data.count);
      setUserRating(data.userRating);
    }

    setLoading(false);
  };

  // display — which skull number to highlight in the UI.
  // Priority: hovering skull > user's submitted rating > 0 (nothing highlighted)
  const display = hover || userRating || 0;

  return (
    <div className="flex flex-col gap-1.5">

      {/* Main row: label + skulls + vote summary */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium">Scare-o-meter:</span>

        {/* Five skull buttons — rendered by mapping the array [1,2,3,4,5] */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              // Disabled for guests (they can hover but not click)
              disabled={!isLoggedIn || loading}
              onClick={() => rate(n)}
              // Only set hover state for logged-in users — guests shouldn't see a
              // misleading preview they can't act on
              onMouseEnter={() => isLoggedIn && setHover(n)}
              onMouseLeave={() => setHover(0)}
              title={isLoggedIn ? `Rate ${n} skull${n > 1 ? 's' : ''}` : 'Log in to rate'}
              className="text-lg leading-none transition-transform hover:scale-110 disabled:cursor-default"
            >
              {/* Skulls at or below the display number are fully opaque;
                  skulls above it are faded to 20% opacity */}
              <Skull
                className={`w-5 h-5 ${n <= display ? 'opacity-100 text-red-500' : 'opacity-20 text-gray-400'}`}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        {/* Show the numeric average + vote count once at least one vote exists */}
        {count > 0 && (
          <span className="text-xs text-gray-500">
            {avg.toFixed(1)} · {count} {count === 1 ? 'vote' : 'votes'}
          </span>
        )}

        {/* Small green checkmark shown after the user has submitted their rating */}
        {userRating && <span className="text-xs text-green-400">✓ Rated</span>}
      </div>

      {/* Guest nudge — shown below the skulls when the visitor isn't logged in */}
      {!isLoggedIn && (
        <p className="text-xs text-gray-600">Log in to rate the scare level</p>
      )}
    </div>
  );
}
