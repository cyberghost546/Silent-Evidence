'use client';
// app/admin/merge/page.tsx
//
// WHY 'use client'?
//   The merge tool is fully interactive: both pickers use live search with debounced
//   API calls, and the merge itself fires an async POST. All of that requires useState,
//   so this must be a Client Component.
//
// PURPOSE:
//   Lets the admin combine two duplicate stories into one. All engagement data
//   (likes, comments, bookmarks, reactions, views) is moved from the source to
//   the target by the API. The source story is then permanently deleted.
//
//   Common use case: an author accidentally posted the same story twice, and
//   each copy has some comments/likes that should be preserved on the surviving version.
//
// ARCHITECTURE:
//   StoryPicker — a reusable search-as-you-type sub-component used twice (source + target).
//     It manages its own local search state (query, results, loading) and calls
//     `onSelect` when the user picks a story, lifting the chosen story up to the parent.
//
//   AdminMergePage — the outer page component that holds the source/target state
//     and fires the actual merge API call when the button is clicked.
//
// API:
//   GET  /api/admin/search?q=...&type=stories  — live story search (used by StoryPicker)
//   POST /api/admin/merge-stories              — { sourceId, targetId } → merges stories
//
// SAFETY:
//   A browser `confirm()` dialog forces the admin to acknowledge that the source
//   will be permanently deleted before the API call fires. The button is also
//   disabled unless both source and target are selected.

import { useState } from 'react';

// Story shape returned by the search API — only the fields the picker needs
type Story = {
  id: number;
  title: string;
  slug: string;
  author: { username: string };
  _count: { likes: number; comments: number };
};

// StoryPicker — search-as-you-type component for selecting one story.
// `label` is the heading (e.g. "Source" or "Target").
// `selected` is the currently chosen story (null = nothing chosen yet).
// `onSelect` is called with the chosen Story when the user clicks a result.
function StoryPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: Story | null;
  onSelect: (s: Story) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Story[]>([]);
  const [searching, setSearching] = useState(false);

  // search() fires on every keystroke — waits for at least 2 characters to avoid
  // hammering the API with single-letter queries.
  const search = async (val: string) => {
    setQ(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/admin/search?q=${encodeURIComponent(val)}&type=stories`);
    const data = await res.json();
    // Cap at 8 results — enough for the picker dropdown, avoids a massive list
    setResults((data.stories ?? []).slice(0, 8));
    setSearching(false);
  };

  return (
    <div className="flex-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      {selected ? (
        <div className="p-4 bg-gray-800 border border-green-600/40 rounded-xl">
          <p className="font-semibold text-white text-sm">{selected.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            by {selected.author.username} · {selected._count.likes} likes ·{' '}
            {selected._count.comments} comments
          </p>
          <button
            type="button"
            onClick={() => {
              onSelect(null as unknown as Story);
              setQ('');
              setResults([]);
            }}
            className="mt-2 text-xs text-gray-600 hover:text-red-400 transition"
          >
            Change ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={q}
            onChange={(e) => search(e.target.value)}
            placeholder="Search story title…"
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600/50 transition"
          />
          {searching && <p className="mt-1 text-xs text-gray-500 animate-pulse">Searching…</p>}
          {results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
              {results.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelect(s);
                    setResults([]);
                    setQ('');
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition border-b border-gray-800 last:border-0"
                >
                  <p className="text-sm text-white">{s.title}</p>
                  <p className="text-xs text-gray-500">by {s.author?.username}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminMergePage() {
  const [source, setSource] = useState<Story | null>(null); // story to be deleted
  const [target, setTarget] = useState<Story | null>(null); // story to receive the data
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState<string | null>(null); // success message
  const [error, setError] = useState<string | null>(null); // API error message

  const merge = async () => {
    if (!source || !target) return;
    // browser confirm acts as a last-chance warning before a destructive, irreversible action
    if (
      !confirm(
        `Merge "${source.title}" INTO "${target.title}"?\n\nThe source story will be permanently deleted. This cannot be undone.`
      )
    )
      return;
    setMerging(true);
    setError(null);
    setResult(null);
    const res = await fetch('/api/admin/merge-stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: source.id, targetId: target.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult(`✓ Merged "${data.merged}" into "${data.into}" successfully.`);
      setSource(null);
      setTarget(null);
    } else {
      setError(data.error ?? 'Merge failed.');
    }
    setMerging(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Story Merge Tool</h1>
      <p className="text-gray-500 text-sm mb-6">
        Merge duplicate stories — likes, comments, bookmarks, reactions, and views are moved to the
        target. The source story is deleted.
      </p>

      {result && (
        <div className="mb-6 px-4 py-3 bg-green-900/20 border border-green-600/40 rounded-xl text-green-400 text-sm">
          {result}
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-900/20 border border-red-600/40 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <StoryPicker label="Source (will be deleted)" selected={source} onSelect={setSource} />

        <div className="flex items-center justify-center text-2xl text-gray-600 lg:mt-8">→</div>

        <StoryPicker label="Target (keeps the data)" selected={target} onSelect={setTarget} />
      </div>

      {/* Preview */}
      {source && target && (
        <div className="p-5 bg-gray-900 border border-yellow-600/30 rounded-2xl mb-6 text-sm">
          <p className="font-semibold text-yellow-400 mb-3">Merge preview</p>
          <ul className="space-y-1 text-gray-400">
            <li>
              • <span className="text-white">{source._count.likes}</span> likes moved to target
            </li>
            <li>
              • <span className="text-white">{source._count.comments}</span> comments moved to
              target
            </li>
            <li>• Views, bookmarks, and reactions also transferred</li>
            <li>
              • <span className="text-red-400 font-semibold">"{source.title}"</span> will be
              permanently deleted
            </li>
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={merge}
        disabled={!source || !target || merging}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {merging ? 'Merging…' : 'Merge Stories'}
      </button>
    </div>
  );
}
