'use client';
// app/components/ui/FearProfilePicker.tsx
// Settings widget that lets a user pick up to 3 preferred story "moods" (e.g. Dark, Mysterious, Action).
// Selections are saved via PATCH /api/profile as a comma-separated fearMoods string.
// The saved preferences power personalised story recommendations.
// Props: initialFearMoods — comma-separated string of pre-selected mood values from the DB.

import { useState } from 'react';
import { MOODS as MOOD_VALUES, MOOD_META } from '@/lib/moods';

// Built from lib/moods.ts. The hard-coded list this replaced offered the old
// generic vocabulary, so a reader's saved "fear profile" could contain values
// (ROMANTIC, COMEDIC …) that no story can ever have — producing recommendations
// that silently matched nothing.
const MOODS = MOOD_VALUES.map((value) => ({
  value,
  label: MOOD_META[value].label,
  accent: MOOD_META[value].accent,
  desc: MOOD_META[value].description,
}));

type Props = { initialFearMoods: string };

export default function FearProfilePicker({ initialFearMoods }: Props) {
  const [selected, setSelected] = useState<string[]>(
    initialFearMoods
      ? initialFearMoods
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : []
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const toggle = (value: string) => {
    setSuccess(false);
    setError('');
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= 3) return prev;
      return [...prev, value];
    });
  };

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
        setError(data.error ?? 'Unable to save.');
        return;
      }
      setSuccess(true);
    } catch {
      setSaving(false);
      setError('Unable to save. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Choose up to <span className="text-white font-semibold">3 moods</span>
        </p>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${selected.length === 3 ? 'border-red-600 text-red-400' : 'border-gray-700 text-gray-500'}`}
        >
          {selected.length} / 3
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {MOODS.map((mood) => {
          const isSelected = selected.includes(mood.value);
          const isDisabled = !isSelected && selected.length >= 3;
          return (
            <button
              key={mood.value}
              onClick={() => toggle(mood.value)}
              disabled={isDisabled}
              className={`relative p-3 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'border-red-600 bg-red-950/30'
                  : isDisabled
                    ? 'border-gray-800 opacity-40 cursor-not-allowed'
                    : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
              }`}
            >
              {isSelected && (
                <svg
                  className="absolute top-2 right-2 w-3.5 h-3.5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className={`w-2 h-2 rounded-full block mb-2 ${mood.accent}`} />
              <p className="text-xs font-semibold text-white">{mood.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{mood.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
        {success && <span className="text-xs text-gray-400">Saved</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
