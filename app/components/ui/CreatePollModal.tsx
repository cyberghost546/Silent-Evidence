'use client';
// CreatePollModal — lets logged-in users create a community poll.
// Supports 2–10 options, an optional close date, and optional group scoping.

import { useState } from 'react';

type PollOption = {
  id: number;
  text: string;
  _count: { votes: number };
  votes: { id: number }[];
};

type CreatedPoll = {
  id: number;
  question: string;
  endsAt: string | null;
  createdAt: string;
  author: { username: string };
  _count: { votes: number };
  options: PollOption[];
};

export default function CreatePollModal({
  groupId,
  onClose,
  onCreated,
}: {
  groupId?: number;
  onClose: () => void;
  onCreated: (poll: CreatedPoll) => void;
}) {
  const [question, setQuestion]   = useState('');
  const [options,  setOptions]    = useState(['', '']);
  const [endsAt,   setEndsAt]     = useState('');
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState('');

  // Add an empty option row (max 10)
  const addOption = () => {
    if (options.length < 10) setOptions(prev => [...prev, '']);
  };

  // Update one option's text
  const setOption = (i: number, val: string) =>
    setOptions(prev => prev.map((o, idx) => (idx === i ? val : o)));

  // Remove an option (min 2 must remain)
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (!question.trim()) { setError('Question is required.'); return; }
    const clean = options.map(o => o.trim()).filter(Boolean);
    if (clean.length < 2) { setError('At least 2 non-empty options required.'); return; }
    setSaving(true);
    setError('');
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options: clean, endsAt: endsAt || null, groupId }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Failed to create poll.'); return; }
    onCreated(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Create Poll</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Question</label>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="What's your favourite horror sub-genre?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={e => setOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(i)} className="text-gray-600 hover:text-red-400 transition px-2">×</button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button onClick={addOption} className="mt-2 text-xs text-gray-500 hover:text-red-400 transition">
                + Add option
              </button>
            )}
          </div>

          {/* Optional close date */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Close date (optional)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {saving ? 'Creating…' : 'Create Poll'}
          </button>
        </div>
      </div>
    </div>
  );
}
