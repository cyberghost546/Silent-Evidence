'use client';
/**
 * app/admin/story-of-week/StoryOfWeekAdmin.tsx
 * ──────────────────────────────────────────────
 * PURPOSE:
 *   Lets the admin manually pin one story as the "Story of the Week" — a
 *   featured highlight shown prominently on the homepage.  The pinned story ID
 *   is stored in the SiteSetting table under the key "story_of_week_id".
 *
 * HOW IT WORKS:
 *   1. The parent server page reads the currently pinned story ID from SiteSetting
 *      and passes it as `currentStoryId` (null if none is pinned).
 *   2. The admin types a story title into the search box and clicks "Search".
 *      This calls GET /api/admin/story-of-week/search?q=... which returns
 *      matching published stories.
 *   3. Each search result has a "Pin" button.  Clicking it POSTs to
 *      /api/admin/story-of-week with the story ID.
 *   4. "Clear" sends DELETE to remove the pin, reverting to automatic selection.
 *
 * WHEN NO STORY IS PINNED:
 *   The site falls back to automatically picking the highest-scoring story of
 *   the week.  Pinning overrides that automatic selection.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - The "search → select → pin" pattern is useful for any "featured item"
 *     admin UI: featured product, pinned post, editor's pick, etc.
 *   - `encodeURIComponent(query)` is essential whenever you put user-typed text
 *     into a URL query string — it safely escapes spaces and special characters.
 *   - Storing a single "featured item" ID in a key-value settings table
 *     (rather than a boolean column on the story itself) is flexible because
 *     you can add more settings without changing the schema.
 */

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';

// ── Type definitions ──────────────────────────────────────────────────────────

// Minimal story fields needed for the search result cards
type Story = {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null; // thumbnail shown in the result card
  author: { username: string };
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoryOfWeekAdmin({
  currentStoryId,
}: {
  // The story ID currently pinned in the database, or null if no pin is set.
  // Passed from the server component so we don't need a client-side fetch on mount.
  currentStoryId: number | null;
}) {
  // The text the admin types in the search input
  const [query, setQuery] = useState('');

  // Stories returned by the search API — displayed as result cards below the input
  const [results, setResults] = useState<Story[]>([]);

  // True while the search API call is in flight — disables the Search button
  const [searching, setSearching] = useState(false);

  // The story ID that is currently pinned as Story of the Week.
  // Starts as whatever the server told us; updates optimistically when the admin pins/clears.
  const [pinnedId, setPinnedId] = useState<number | null>(currentStoryId);

  // True while a pin or clear API call is in flight
  const [saving, setSaving] = useState(false);

  // Success or error feedback shown below the banner
  // e.g. "Story of the Week updated!" or "Failed to save."
  const [message, setMessage] = useState('');

  // ── Search ────────────────────────────────────────────────────────────────

  // Calls the search API with the current query and populates `results`.
  // `encodeURIComponent` makes the query URL-safe (e.g. spaces become %20).
  const search = async () => {
    if (!query.trim()) return; // don't search with an empty string
    setSearching(true);
    const res = await fetch(`/api/admin/story-of-week/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setSearching(false);
    // Only update results if the API returned an array (guard against error shapes)
    if (Array.isArray(data)) setResults(data);
  };

  // ── Pin a story ───────────────────────────────────────────────────────────

  // POSTs the selected story ID to the API which saves it in SiteSetting.
  // On success, updates local state so the "Current pick" badge appears immediately.
  const pin = async (storyId: number) => {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/story-of-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId }),
    });
    setSaving(false);
    if (res.ok) {
      setPinnedId(storyId);                        // update the banner immediately
      setMessage('Story of the Week updated!');
    } else {
      setMessage('Failed to save.');
    }
  };

  // ── Clear the pin ─────────────────────────────────────────────────────────

  // Removes the pinned story, reverting the homepage to automatic selection.
  const clear = async () => {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/story-of-week', { method: 'DELETE' });
    setSaving(false);
    if (res.ok) {
      setPinnedId(null);   // remove the "Currently Pinned" banner
      setResults([]);      // clear search results too
      setMessage('Story of the Week cleared.');
    }
  };

  // Shared CSS class string for the search text input — stored in a variable
  // to avoid repeating the long className string in the JSX below.
  const inputCls = 'w-full bg-gray-800 border border-gray-700 focus:border-red-600 focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 transition';

  return (
    <div className="space-y-6">
      {/* Current pick banner */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Currently Pinned Story</p>
          <p className="text-sm text-white font-medium">
            {pinnedId ? `Story ID #${pinnedId}` : 'None — auto-selection is active'}
          </p>
        </div>
        {pinnedId && (
          <button
            onClick={clear}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Success / error message */}
      {message && (
        <p className={`text-sm px-4 py-3 rounded-xl border ${
          message.includes('Failed')
            ? 'text-red-400 bg-red-400/10 border-red-400/20'
            : 'text-red-400 bg-red-400/10 border-red-400/20'
        }`}>
          {message}
        </p>
      )}

      {/* Search bar */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Search for a story to pin
        </label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search(); }}
            placeholder="Story title…"
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={search}
            disabled={searching || !query.trim()}
            className="px-5 py-2.5 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-4 bg-gray-800 border rounded-xl p-3 transition ${
                pinnedId === s.id ? 'border-yellow-500/60 bg-yellow-500/5' : 'border-gray-700'
              }`}
            >
              {/* Thumbnail */}
              {s.coverImage ? (
                <Image src={s.coverImage} alt={s.title} width={64} height={48} className="object-cover rounded-lg shrink-0" />
              ) : (
                <div className="w-16 h-12 bg-gray-700 rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                <p className="text-xs text-gray-500">by {s.author.username}</p>
              </div>
              {pinnedId === s.id ? (
                <span className="inline-flex items-center gap-1 text-xs text-yellow-400 font-bold px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/30">
                  <Sparkles className="w-3 h-3" /> Current pick
                </span>
              ) : (
                <button
                  onClick={() => pin(s.id)}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 transition"
                >
                  Pin
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
