'use client';
// FearProfilePicker.tsx
// Lets a user choose up to 3 horror moods as their "horror mood/vibe picker".
// The selection is saved to their Profile.fearMoods field via PATCH /api/profile.
// Displayed on their public profile as a horror personality badge.

import { useState } from 'react';

// All available horror moods with display info (value matches the DB enum)
const MOODS = [
  { value: 'EPIC',         label: 'Epic',         emoji: '⚔️', desc: 'Grand battles and heroic moments'  },
  { value: 'HEARTWARMING', label: 'Heartwarming', emoji: '💖', desc: 'Stories that touch the soul'        },
  { value: 'MYSTERIOUS',   label: 'Mysterious',   emoji: '🔮', desc: 'Puzzles, secrets, and intrigue'     },
  { value: 'ACTION',       label: 'Action',       emoji: '💥', desc: 'Non-stop fights and adrenaline'     },
  { value: 'ROMANTIC',     label: 'Romantic',      emoji: '🌸', desc: 'Love stories and tender moments'   },
  { value: 'COMEDIC',      label: 'Comedic',       emoji: '😂', desc: 'Laughs, gags, and fun chaos'       },
  { value: 'DRAMATIC',     label: 'Dramatic',      emoji: '🎭', desc: 'Intense emotions and plot twists'  },
  { value: 'DARK',         label: 'Dark',          emoji: '🌑', desc: 'Grim themes and moral ambiguity'   },
];

// Props type — initialFearMoods comes as a comma-separated string from the DB
type Props = {
  // Comma-separated initial mood values from the DB, e.g. "EPIC,DARK"
  initialFearMoods: string;
};

// Main picker component — lets the user pick up to 3 horror vibes
export default function FearProfilePicker({ initialFearMoods }: Props) {
  // Parse the saved moods into an array (split on commas, drop empty strings)
  const [selected, setSelected] = useState<string[]>(
    initialFearMoods
      ? initialFearMoods.split(',').map((value) => value.trim()).filter(Boolean)
      : []
  );
  // Track whether a save is in flight and whether the last save succeeded
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  // Toggle a mood on/off — max 3 allowed
  const toggle = (value: string) => {
    setSuccess(false); // Clear the "saved" indicator on new interaction
    setError('');
    setSelected(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value); // remove if already selected
      if (prev.length >= 3) return prev;                               // cap at 3
      return [...prev, value];                                         // add new mood
    });
  };

  // Save to the server via PATCH /api/profile (sends comma-joined string)
  const save = async () => {
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fearMoods: selected.join(',') }),
      });

      const data = await res.json();
      setSaving(false);

      if (!res.ok) {
        setError(data.error ?? 'Unable to save your horror vibes.');
        return;
      }

      setSuccess(true); // Show confirmation after save completes
    } catch (err) {
      setSaving(false);
      setError('Unable to save your horror vibes. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Instruction text + counter badge */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Choose up to <span className="text-white font-semibold">3 moods</span> that define your horror taste</p>
        {/* Counter turns green when max is reached */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${selected.length === 3 ? 'border-red-600 text-red-400' : 'border-gray-700 text-gray-500'}`}>
          {selected.length}/3
        </span>
      </div>

      {/* Mood grid — 2 columns on mobile, 4 on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MOODS.map(mood => {
          const isSelected = selected.includes(mood.value); // Whether this mood is currently picked
          const isDisabled = !isSelected && selected.length >= 3; // Disable unpicked moods at max

          return (
            <button
              key={mood.value}
              onClick={() => toggle(mood.value)}
              disabled={isDisabled}
              className={`
                relative p-3 rounded-xl border text-left transition-all duration-200
                ${isSelected
                  ? 'border-red-600 bg-red-950/40 shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                  : isDisabled
                    ? 'border-gray-800 opacity-40 cursor-not-allowed'
                    : 'border-gray-700 hover:border-red-700/50 hover:bg-gray-800/50'
                }
              `}
            >
              {/* Checkmark overlay when this mood is selected */}
              {isSelected && (
                <span className="absolute top-2 right-2 text-red-400 text-xs">✓</span>
              )}
              {/* Mood emoji, label, and description */}
              <span className="text-2xl block mb-1">{mood.emoji}</span>
              <p className="text-xs font-bold text-white">{mood.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{mood.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Save button + success/error indicator */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {saving ? 'Saving…' : 'Save Horror Vibes'}
          </button>
          {/* Brief red confirmation after a successful save */}
          {success && (
            <span className="text-xs text-red-400 animate-pulse">✓ Saved!</span>
          )}
        </div>
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
    </div>
  );
}
