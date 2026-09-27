'use client';
// app/components/ui/ReactionBar.tsx
// Emoji reaction row that appears below a story.
// Readers can react with one of four reaction types: LOVE, HYPE, KAWAII, or FIRE.
//
// Rules:
//   • Only one reaction is allowed per user per story.
//   • Clicking a reaction you already selected will toggle it OFF (remove it).
//   • Clicking a different reaction replaces the old one.
//   • The count displayed next to each emoji comes from the server and is
//     updated in real time after each toggle call.

import { useState } from 'react'; // useState — tracks current counts, which reaction the user has selected, and the loading state
import { Heart, Flame, Smile, Zap } from 'lucide-react';

// REACTIONS — the full list of available reaction types with display info
// Each object has:
//   type  — the string sent to and stored in the database (e.g. "LOVE")
//   emoji — the visual emoji shown on the button
//   label — accessible tooltip text (title attribute)
const REACTIONS = [
  { type: 'LOVE', icon: Heart, label: 'Love' },
  { type: 'HYPE', icon: Flame, label: 'Hype' },
  { type: 'KAWAII', icon: Smile, label: 'Kawaii' },
  { type: 'FIRE', icon: Zap, label: 'Epic' },
];

// Counts — a simple mapping from reaction type string to its integer count
// e.g. { LOVE: 12, HYPE: 3, KAWAII: 0, FIRE: 7 }
type Counts = Record<string, number>;

// Props passed in from the parent story page
type Props = {
  storyId: number; // the story's database ID — sent to the API with each toggle
  initialCounts: Counts; // reaction counts fetched server-side before the page rendered
  userReactions: string[]; // reaction types the current user has already selected (max 1 item)
};

export default function ReactionBar({ storyId, initialCounts, userReactions }: Props) {
  // counts — live reaction counts, starts from server-side data and updates after each toggle
  const [counts, setCounts] = useState<Counts>(initialCounts);

  // reacted — which reaction type the user currently has active (null = no reaction selected)
  // Only one reaction is allowed at a time, so we store a single string instead of an array
  const [reacted, setReacted] = useState<string | null>(userReactions[0] ?? null);

  // loading — the type string of the reaction button currently being processed
  // This disables just that button while the API call is in-flight (not all buttons)
  const [loading, setLoading] = useState<string | null>(null);

  // toggle — called when the user clicks any reaction button
  // Sends the reaction type to /api/reactions, then updates counts and the active reaction
  const toggle = async (type: string) => {
    setLoading(type); // mark this specific button as loading

    // POST the reaction toggle to the API
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The API expects { storyId, type } and handles the toggle logic server-side
      body: JSON.stringify({ storyId, type }),
    });

    if (res.ok) {
      // Parse the updated counts and whether the reaction is now active
      const data = await res.json();

      // Replace all counts with the fresh server values
      setCounts(data.counts);

      // If data.reacted is true the user now has this reaction; false means they removed it
      setReacted(data.reacted ? type : null);
    }

    // Clear the loading state whether the request succeeded or failed
    setLoading(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    // Flex row that wraps on narrow screens so all four buttons fit
    <div className="flex flex-wrap items-center gap-2">
      {/* "React:" label — purely visual, not a form label */}
      <span className="text-xs text-gray-500 mr-1">React:</span>

      {/* Render one button per reaction type */}
      {REACTIONS.map(({ type, icon: Icon, label }) => {
        // active — true when this button's type matches the user's current reaction
        const active = reacted === type;

        // count — how many users have this reaction (0 if not in the counts map yet)
        const count = counts[type] ?? 0;

        return (
          <button
            key={type} // unique React key — the reaction type string
            onClick={() => toggle(type)} // toggle this reaction on click
            disabled={loading === type} // disable only while THIS button's request is in-flight
            title={label} // tooltip shown on hover (e.g. "Love")
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
              active
                ? 'bg-gray-700 border-gray-500 text-white' // highlighted when this reaction is selected
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white' // default ghost style
            }`}
          >
            {/* Emoji icon for this reaction type */}
            <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />

            {/* Count badge — only shown when count is greater than zero to avoid "0" clutter */}
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
