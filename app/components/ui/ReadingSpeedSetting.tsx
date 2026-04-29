'use client';
// app/components/ui/ReadingSpeedSetting.tsx
// Settings widget where users choose their reading speed (Slow / Average / Fast / Speed Reader).
// The selected WPM is saved to localStorage under the key "readingSpeed" and is read by
// the readingTime() utility to show personalised estimated read times on story cards.
// No props needed — reads and writes localStorage directly. Drop anywhere in a settings page.

import { useState } from 'react';

const SPEEDS = [
  {
    value: 'slow',
    label: 'Slow',
    wpm:   150,
    desc:  '~150 wpm — savour every word',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
  {
    value: 'average',
    label: 'Average',
    wpm:   238,
    desc:  '~238 wpm — standard pace',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    value: 'fast',
    label: 'Fast',
    wpm:   350,
    desc:  '~350 wpm — quick reader',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
];

type Props = { initialSpeed: string };

export default function ReadingSpeedSetting({ initialSpeed }: Props) {
  const [speed,  setSpeed]  = useState(initialSpeed || 'average');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const save = async (val: string) => {
    setSpeed(val);
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/user/reading-speed', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ readingSpeed: val }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {SPEEDS.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => save(s.value)}
            className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition ${
              speed === s.value
                ? 'border-red-500 bg-red-500/10 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
          >
            <span className={speed === s.value ? 'text-red-400' : 'text-gray-500'}>{s.icon}</span>
            <div>
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-600">
        {saving && 'Saving…'}
        {saved  && <span className="text-gray-400">Saved</span>}
        {!saving && !saved && 'Reading time estimates on stories will adjust to your pace.'}
      </p>
    </div>
  );
}
