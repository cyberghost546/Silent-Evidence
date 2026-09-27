'use client';
// app/admin/generate/GenerateClient.tsx
// Admin UI for generating a single AI-written horror story.
// The admin picks a category, mood, tone, length, and an optional seed prompt,
// then clicks "Generate Story". This calls /api/admin/generate-story which
// sends the settings to Claude (Anthropic's AI) and saves the result as a draft.
// The admin can then preview it or go to /admin/stories to publish it.
//
// This is the "Single Story" tab — for bulk generation see BatchClient.tsx.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bot, Zap, Key, Heart, Bug, Frown, Wind, Brain, Droplet, Ghost } from 'lucide-react';

// Mood options control the emotional tone sent to the AI prompt.
// "none" = let the AI choose freely.
const MOODS = [
  { value: 'none', label: 'Any mood' },
  { value: 'CREEPY', label: 'Creepy' },
  { value: 'PARANOID', label: 'Paranoid' },
  { value: 'DISTURBING', label: 'Disturbing' },
  { value: 'ATMOSPHERIC', label: 'Atmospheric' },
  { value: 'PSYCHOLOGICAL', label: 'Psychological' },
  { value: 'SUPERNATURAL', label: 'Supernatural' },
  { value: 'GORE', label: 'Gore' },
  { value: 'JUMPSCARE', label: 'Jumpscare' },
];

// Writing tone presets sent to the AI — e.g. "Found footage style" instructs Claude
// to write as if the story is discovered documents/recordings rather than narrated fiction.
const TONES = [
  'Dark and unsettling',
  'Slow burn dread',
  'Based on a true story',
  'Psychological thriller',
  'Folklore and legend',
  'Found footage style',
  'Cosmic',
  'Gothic',
];

type Category = { id: number; name: string; slug: string };

export default function GenerateClient({ categories }: { categories: Category[] }) {
  const router = useRouter();

  // Form state — each value is sent to the API to control how Claude writes the story
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? '');
  const [mood, setMood] = useState('none');
  const [tone, setTone] = useState(TONES[0]);
  const [length, setLength] = useState('medium');
  // Seed prompt is optional — lets the admin give Claude a starting idea or scenario
  const [seedPrompt, setSeedPrompt] = useState('');

  // UI state
  const [generating, setGenerating] = useState(false); // true while waiting for Claude
  const [result, setResult] = useState<{ title: string; slug: string } | null>(null); // set on success
  const [error, setError] = useState(''); // shown if generation fails
  const [log, setLog] = useState(''); // short status message shown below the button

  // Sends the selected options to the API which calls Claude and saves the story as a draft.
  // The story is NOT published automatically — the admin must review it first.
  const generate = async () => {
    if (!categorySlug) return;
    setGenerating(true);
    setResult(null);
    setError('');
    setLog('Asking Claude to write a story…');

    try {
      const res = await fetch('/api/admin/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorySlug, mood, tone, length, seedPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Generation failed.');
        setLog('');
      } else {
        // Success — story was created and saved as a draft in the database
        setResult({ title: data.title, slug: data.slug });
        setLog('Story saved as draft!');
      }
    } catch {
      setError('Network error. Please try again.');
      setLog('');
    }
    setGenerating(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-1 h-7 bg-red-500 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-white">AI Story Generator</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Use Claude to write horror stories for your site
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
          {categories.length === 0 ? (
            <p className="text-sm text-red-400">No categories found. Add some categories first.</p>
          ) : (
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Mood */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Mood</label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  mood === m.value
                    ? 'bg-red-600/30 border-red-500 text-red-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Writing Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  tone === t
                    ? 'bg-red-600/30 border-red-500 text-red-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Length */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Story Length</label>
          <div className="flex gap-2">
            {[
              { value: 'short', label: 'Short', sub: '400–600 words' },
              { value: 'medium', label: 'Medium', sub: '700–1000 words' },
              { value: 'long', label: 'Long', sub: '1200–1800 words' },
            ].map((l) => (
              <button
                key={l.value}
                onClick={() => setLength(l.value)}
                className={`flex-1 py-2.5 rounded-xl border text-sm transition ${
                  length === l.value
                    ? 'bg-red-600/20 border-red-500 text-red-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-medium">{l.label}</div>
                <div className="text-xs opacity-60">{l.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Seed prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Story Seed <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <textarea
            value={seedPrompt}
            onChange={(e) => setSeedPrompt(e.target.value)}
            placeholder="e.g. A night shift worker finds a door that wasn't there yesterday..."
            rows={3}
            suppressHydrationWarning
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-600"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={generating || !categorySlug}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <Bot className="w-4 h-4" /> Generate Story
            </>
          )}
        </button>

        {log && <p className="text-sm text-gray-400 text-center">{log}</p>}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-4 space-y-3">
            <p className="text-sm font-semibold text-red-400">Story generated successfully!</p>
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Title:</span> {result.title}
            </p>
            <div className="flex gap-2">
              <a
                href={`/story/${result.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition"
              >
                Preview
              </a>
              <button
                onClick={() => router.push('/admin/stories')}
                className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Review &amp; Publish →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
        <p className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 flex-shrink-0" /> Stories are saved as{' '}
          <strong className="text-gray-400">drafts</strong> — review before publishing.
        </p>
        <p className="flex items-center gap-1.5">
          <Key className="w-3 h-3 flex-shrink-0" /> Requires{' '}
          <strong className="text-gray-400">ANTHROPIC_API_KEY</strong> in your <code>.env</code>{' '}
          file.
        </p>
        <p className="flex items-center gap-1.5">
          <Heart className="w-3 h-3 flex-shrink-0 text-purple-400" /> Powered by{' '}
          <strong className="text-gray-400">Claude Opus 4.6</strong>
        </p>
      </div>
    </div>
  );
}
