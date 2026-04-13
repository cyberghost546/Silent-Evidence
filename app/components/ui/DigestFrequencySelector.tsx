'use client';
// app/components/ui/DigestFrequencySelector.tsx
// Lets the user choose how often they receive the comment digest email.
// Shown in /settings under Notifications. Options: Daily, Weekly, Never.

import { useState } from 'react';

// The three valid frequency options
type Frequency = 'DAILY' | 'WEEKLY' | 'NEVER';

interface Props {
  // Current value loaded server-side from User.digestFrequency
  initialFrequency: Frequency;
}

// Human-readable labels and descriptions for each option
const OPTIONS: { value: Frequency; label: string; desc: string }[] = [
  {
    value: 'DAILY',
    label: 'Daily',
    desc:  'Receive a summary of new comments every morning.',
  },
  {
    value: 'WEEKLY',
    label: 'Weekly',
    desc:  'A roundup of activity from the past week, every Monday.',
  },
  {
    value: 'NEVER',
    label: 'Never',
    desc:  'No digest emails. You can still see comments in the app.',
  },
];

export default function DigestFrequencySelector({ initialFrequency }: Props) {
  const [frequency, setFrequency] = useState<Frequency>(initialFrequency);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');

  // Called when the user clicks a different frequency option
  const handleChange = async (next: Frequency) => {
    if (next === frequency) return; // no change
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const res = await fetch('/api/user/digest-frequency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: next }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setFrequency(next);
      setSaved(true);
      // Clear the "Saved" message after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-800 rounded-xl p-4 bg-gray-900">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-white">Comment Digest Emails</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose how often you receive a summary of new comments on your stories.
          </p>
        </div>
        {/* Saved confirmation */}
        {saved && <span className="text-xs text-green-400 font-medium flex-shrink-0">✓ Saved</span>}
      </div>

      {/* Radio button group — one option per frequency */}
      <div className="flex flex-col gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={saving}
            // Highlight the selected option with a red border
            className={`flex items-start gap-3 text-left p-3 rounded-lg border transition-colors disabled:opacity-50 ${
              frequency === opt.value
                ? 'border-red-500/50 bg-red-500/5'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800'
            }`}
          >
            {/* Custom radio dot */}
            <span
              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                frequency === opt.value ? 'border-red-500' : 'border-gray-600'
              }`}
            >
              {frequency === opt.value && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </span>

            {/* Label + description */}
            <div>
              <p className={`text-sm font-semibold ${frequency === opt.value ? 'text-white' : 'text-gray-300'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
