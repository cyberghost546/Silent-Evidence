'use client';
// app/series/new/NewSeriesForm.tsx
// Client component — handles the create-series form, submission, and redirect.
// Posts to /api/series and redirects to /series/[slug] on success.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSeriesForm() {
  const router = useRouter();

  // Form field state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      // Redirect to the new series page after creation
      router.push(`/series/${data.slug}`);
    } catch {
      setError('Failed to create series. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Series Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Series Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. The Whispering Dark"
          required
          maxLength={100}
          suppressHydrationWarning
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
        />
        {/* Character counter */}
        <p className="text-xs text-gray-600 mt-1 text-right">{name.length}/100</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Description <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this series about? Give readers a taste of what awaits them..."
          rows={4}
          maxLength={500}
          suppressHydrationWarning
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition resize-none"
        />
        <p className="text-xs text-gray-600 mt-1 text-right">{description.length}/500</p>
      </div>

      {/* Info box */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-xs text-gray-400 space-y-1">
        <p>• After creating your series, go to any story and assign it to this series.</p>
        <p>• Stories in a series are shown in order so readers can follow along.</p>
        <p>• You can mark the series complete once all parts are published.</p>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
      >
        {saving ? 'Creating...' : 'Create Series'}
      </button>
    </form>
  );
}
