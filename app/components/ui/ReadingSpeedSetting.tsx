'use client';
/**
 * ReadingSpeedSetting.tsx
 *
 * WHAT THIS FILE DOES:
 * Renders three reading-speed preset buttons (Slow / Average / Fast).
 * When the user clicks one it immediately saves their preference to the
 * server via PATCH /api/user/reading-speed and shows a brief "Saved ✓"
 * confirmation. The selected speed is stored on the User record in the
 * database and is used site-wide to calculate personalised read-time
 * estimates on story cards (e.g. "3 min read" becomes "5 min read" for a
 * slow reader).
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Copy the SPEEDS array and adjust wpm values to suit your content.
 * 2. Change the PATCH endpoint to whatever your API uses.
 * 3. Drop <ReadingSpeedSetting initialSpeed="average" /> into any
 *    account settings page — it's entirely self-contained.
 *
 * Example usage:
 *   <ReadingSpeedSetting initialSpeed={user.readingSpeed ?? 'average'} />
 */

import { useState } from 'react';

// SPEEDS — the three preset options shown as button cards.
// Each object has:
//   value  — the string saved to the DB / sent to the API
//   label  — the human-readable button label
//   wpm    — words per minute (used for display only; the API does the math)
//   icon   — emoji shown above the label
//   desc   — short description shown below the label
const SPEEDS = [
  {
    value: 'slow',
    label: 'Slow',
    wpm: 150,
    icon: '🐢',
    desc: '~150 words/min — I like to savour every word',
  },
  {
    value: 'average',
    label: 'Average',
    wpm: 238,
    icon: '📖',
    desc: '~238 words/min — standard reading pace',
  },
  {
    value: 'fast',
    label: 'Fast',
    wpm: 350,
    icon: '⚡',
    desc: '~350 words/min — I read quickly',
  },
];

// Props — only one: the speed string already saved in the database for this user.
// Pass 'average' as a safe default if the user hasn't chosen yet.
type Props = { initialSpeed: string };

export default function ReadingSpeedSetting({ initialSpeed }: Props) {
  // speed — which of the three presets is currently active.
  // useState initialises it from the prop (the server-fetched value).
  const [speed, setSpeed]   = useState(initialSpeed || 'average');

  // saving — true while the fetch is in-flight; used to prevent double-clicks
  // and to show the "Saving…" status text.
  const [saving, setSaving] = useState(false);

  // saved — true for 2 seconds after a successful save so the user sees "✓ Saved".
  const [saved,  setSaved]  = useState(false);

  // save — called when the user clicks a speed button.
  // It immediately updates the local state (optimistic UI) then persists to the DB.
  const save = async (val: string) => {
    setSpeed(val);    // update the highlighted button right away
    setSaving(true);
    setSaved(false);

    // PATCH request: sends { readingSpeed: "slow" | "average" | "fast" }
    const res = await fetch('/api/user/reading-speed', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readingSpeed: val }),
    });

    setSaving(false);

    if (res.ok) {
      setSaved(true);
      // Automatically hide the "Saved" badge after 2 seconds so it doesn't linger
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div>
      {/* Three-column grid — one button per preset.
          The active button gets a red border + tinted background to show selection. */}
      <div className="grid grid-cols-3 gap-3">
        {SPEEDS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => save(s.value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition ${
              speed === s.value
                ? 'border-red-500 bg-red-500/10 text-white'   // selected state
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white' // idle state
            }`}
          >
            {/* Large emoji icon — turtle / book / lightning bolt */}
            <span className="text-3xl">{s.icon}</span>
            {/* Speed label */}
            <span className="text-sm font-semibold">{s.label}</span>
            {/* Short description + wpm figure */}
            <span className="text-xs text-gray-500">{s.desc}</span>
          </button>
        ))}
      </div>

      {/* Status indicator area — shows three possible states:
          1. "Saving…"  while the request is in-flight
          2. "✓ Saved"  for 2 seconds after a successful save
          3. Helper tip  when idle                                          */}
      <p className="text-xs text-gray-600 mt-3">
        {saving && 'Saving…'}
        {saved && <span className="text-green-500">✓ Saved</span>}
        {!saving && !saved && 'Reading times on stories will adjust to your pace.'}
      </p>
    </div>
  );
}
