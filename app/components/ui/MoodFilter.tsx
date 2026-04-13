'use client';
// app/components/ui/MoodFilter.tsx
// Horizontal scrollable row of horror mood pills used on the Latest Stories section.
//
// Clicking a mood pill calls the `onChange` prop with the selected mood value so the
// parent component can filter its story list — no page reload needed.
// Clicking "All" (empty string value) resets the filter and shows everything.
//
// This component doesn't hold the selected mood in its own state — the parent owns
// that state and passes the current value back in via `activeMood`. This pattern
// (called "controlled component") means the parent always knows what's selected.

import { useState } from 'react';

// MoodOption — the shape of each item in the MOODS list
export type MoodOption = {
  value: string; // the database value stored on each story (e.g. 'CREEPY'). Empty string = "All"
  label: string; // the human-readable label shown on the button
  icon: string;  // emoji shown next to the label
};

// MOODS — the master list of all mood options.
// The first entry (empty string value) is the "All" reset option.
// These value strings must match exactly what's stored in the story.mood field in the database.
export const MOODS: MoodOption[] = [
  { value: '',              label: 'All',           icon: '✨' },
  { value: 'EPIC',          label: 'Epic',          icon: '⚔️' },
  { value: 'HEARTWARMING',  label: 'Heartwarming',  icon: '💖' },
  { value: 'MYSTERIOUS',    label: 'Mysterious',    icon: '🔮' },
  { value: 'ACTION',        label: 'Action',        icon: '💥' },
  { value: 'ROMANTIC',      label: 'Romantic',      icon: '🌸' },
  { value: 'COMEDIC',       label: 'Comedic',       icon: '😂' },
  { value: 'DRAMATIC',      label: 'Dramatic',      icon: '🎭' },
  { value: 'DARK',          label: 'Dark',          icon: '🌑' },
];

type Props = {
  activeMood: string;              // the currently selected mood value (controlled by parent)
  onChange: (mood: string) => void; // callback fired when the user picks a different mood
};

export default function MoodFilter({ activeMood, onChange }: Props) {
  return (
    // overflow-x-auto makes the row scrollable on small screens so all pills stay reachable.
    // scrollbar-hide is a Tailwind plugin class that hides the scrollbar visually while
    // keeping the scroll behaviour — keeps the UI clean on desktop.
    // flex-shrink-0 on each button prevents pills from being squashed when there's no room.
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {MOODS.map(m => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition ${
            // Active pill gets a solid red background; inactive pills are outlined and grey
            activeMood === m.value
              ? 'bg-red-600 border-red-600 text-white'
              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white bg-transparent'
          }`}
        >
          <span>{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
