'use client';
// app/admin/spotlight/SpotlightClient.tsx
//
// WHY 'use client'?
//   The story search input, set/clear actions, and flash messages all need
//   useState and fetch calls — these only work in Client Components.
//
// PURPOSE:
//   Interactive UI to set or clear the homepage Story Spotlight.
//   Only one story can be in the spotlight at a time. The admin searches for a
//   story, selects it, and the `spotlight_story_id` setting is updated.
//
// PATTERN:
//   `current` starts from the `initial` prop (server-fetched) and is updated
//   in local state after each set/clear — no page reload needed.
//   `set()` POSTs the story ID; `clear()` sends a DELETE request.
//
// SEARCH FLOW:
//   `lookup()` fires on button click or Enter key press.
//   Selecting a result from the dropdown sets it immediately and clears the search.

import { useState } from 'react';
import Link from 'next/link';

// Story shape — only the fields needed for the spotlight preview and search results
type Story = { id: number; title: string; slug: string; author: { username: string } };

export default function SpotlightClient({ current: initial }: { current: Story | null }) {
  const [current, setCurrent] = useState(initial); // currently spotlighted story (null = none)
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Story[]>([]);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  };

  const lookup = async () => {
    if (!search.trim()) return;
    const res = await fetch(`/api/admin/spotlight?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setResults(data.stories ?? []);
  };

  const set = async (story: Story) => {
    await fetch('/api/admin/spotlight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: story.id }),
    });
    setCurrent(story);
    setResults([]);
    setSearch('');
    flash(`"${story.title}" is now in the spotlight.`);
  };

  const clear = async () => {
    await fetch('/api/admin/spotlight', { method: 'DELETE' });
    setCurrent(null);
    flash('Spotlight cleared.');
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">
          {msg}
        </div>
      )}

      {current ? (
        <div className="bg-gray-900 border border-red-600/30 rounded-2xl p-6">
          <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">
            Current spotlight
          </p>
          <p className="text-lg font-bold text-white">{current.title}</p>
          <p className="text-sm text-gray-500 mb-4">by {current.author.username}</p>
          <div className="flex gap-3">
            <Link
              href={`/story/${current.slug}`}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition"
            >
              View story
            </Link>
            <button
              onClick={clear}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-semibold rounded-xl transition border border-red-600/30"
            >
              Clear spotlight
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center text-gray-600">
          No story in the spotlight right now.
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Search for a story</h2>
        <div className="flex gap-3 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookup()}
            placeholder="Search story title…"
            className="flex-1 bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition"
          />
          <button
            onClick={lookup}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Search
          </button>
        </div>
        {results.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-4 py-3 border border-gray-800 rounded-xl mb-2 hover:border-gray-700 transition"
          >
            <div>
              <p className="text-sm font-semibold text-white">{s.title}</p>
              <p className="text-xs text-gray-500">by {s.author.username}</p>
            </div>
            <button
              onClick={() => set(s)}
              className="text-xs text-red-400 hover:text-red-300 transition font-semibold"
            >
              Spotlight →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
