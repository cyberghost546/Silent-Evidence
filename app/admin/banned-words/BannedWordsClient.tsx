'use client';
/**
 * app/admin/banned-words/BannedWordsClient.tsx
 * ─────────────────────────────────────────────
 * PURPOSE:
 *   Admin panel for managing the site's banned-word / banned-phrase list.
 *   Any story content, comment, or user-generated text that contains an exact
 *   match of a banned word is blocked or flagged by the content moderation layer.
 *
 * HOW IT FITS WITH THE PARENT PAGE:
 *   The parent server page (`app/admin/banned-words/page.tsx`) fetches all
 *   existing banned words from the database via Prisma and passes them as the
 *   `words` prop.  This avoids a loading spinner — the list is ready on first paint.
 *   All subsequent mutations (add / remove) are handled here client-side via fetch.
 *
 * STATE MODEL:
 *   words   — the live list of banned words, initialised from server props and
 *             updated optimistically after add/remove so the UI stays in sync
 *             without a full page reload.
 *   input   — controlled value of the "add word" text input.
 *   loading — true while the POST request is in flight; disables the Add button
 *             to prevent duplicate submissions.
 *   msg     — short success/error feedback string; auto-clears after 3 seconds
 *             via the `flash` helper so the admin doesn't need to dismiss it.
 *
 * API CALLS:
 *   POST   /api/admin/banned-words  { word }         → adds a word, returns the new DB record
 *   DELETE /api/admin/banned-words  { id }           → removes a word by ID
 *
 * KEY PATTERNS:
 *   - Optimistic UI: the word is added to / removed from `words` immediately after
 *     a successful API call, before any page reload.  The list is re-sorted
 *     alphabetically after each add via Array.sort + String.localeCompare.
 *   - flash() uses setTimeout to auto-dismiss the feedback message after 3 s,
 *     which is cleaner than requiring the admin to close a toast manually.
 *   - The Add button and Enter-key handler both call the same `add` function,
 *     so keyboard and mouse users get identical behaviour.
 */

import { useState } from 'react';

// ── Type definition ────────────────────────────────────────────────────────────

// Shape of a single banned-word row as returned by the API / Prisma
type Word = {
  id: number; // database primary key — used to identify which row to delete
  word: string; // the banned phrase (stored lowercase by the server)
  createdAt: string; // ISO date string — when the word was added (not currently displayed)
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BannedWordsClient({ words: initial }: { words: Word[] }) {
  // Local copy of the word list — starts as whatever the server passed in.
  // Updated after each add/remove so the tag cloud stays current without a reload.
  const [words, setWords] = useState(initial);

  // Controlled input value for the "add new word" field
  const [input, setInput] = useState('');

  // True while the POST /api/admin/banned-words call is in flight.
  // Used to disable the button and prevent duplicate submissions.
  const [loading, setLoading] = useState(false);

  // Feedback message shown in a green box at the top.
  // Set by flash() and auto-cleared after 3 seconds.
  const [msg, setMsg] = useState('');

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Displays a feedback message for 3 seconds then hides it automatically.
  // This avoids cluttering the UI with persistent alerts that need dismissing.
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  };

  // ── Add a word ────────────────────────────────────────────────────────────

  // Guard: do nothing if the input is blank or a request is already in flight.
  // This same function is called by both the button onClick and the Enter key handler.
  const add = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);

    // POST the new word to the API — the server stores it lowercase and returns
    // the full Prisma record (id, word, createdAt) so we can add it to local state.
    const res = await fetch('/api/admin/banned-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: input.trim() }),
    });

    if (res.ok) {
      const created = await res.json(); // { id, word, createdAt }
      // Append the new word and re-sort the array alphabetically so the tag cloud
      // remains in order regardless of insertion position.
      setWords((w) => [...w, created].sort((a, b) => a.word.localeCompare(b.word)));
      setInput(''); // clear the input ready for the next word
      flash('Word added.');
    }

    setLoading(false);
  };

  // ── Remove a word ─────────────────────────────────────────────────────────

  // Sends a DELETE request with the word's database ID, then removes it from
  // local state so the tag disappears immediately.
  // Note: no loading guard here because each tag has its own remove button and
  // concurrent deletes are harmless (each targets a different ID).
  const remove = async (id: number) => {
    await fetch('/api/admin/banned-words', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    // Filter the deleted word out of the local array — O(n) but the list is small
    setWords((w) => w.filter((x) => x.id !== id));
    flash('Word removed.');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Feedback banner ──────────────────────────────────────────────────
          Only rendered when `msg` is non-empty.  The green tinted box provides
          low-key visual confirmation without a full toast notification system. */}
      {msg && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">
          {msg}
        </div>
      )}

      {/* ── Add form ─────────────────────────────────────────────────────────
          A flex row: input grows to fill available space, button stays fixed width.
          onKeyDown lets keyboard users press Enter instead of clicking Add. */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Add word or phrase</h2>
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            // Allow keyboard submission — calls the same `add` function as the button
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="e.g. badword"
            className="flex-1 bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none transition"
          />
          <button
            onClick={add}
            // Disabled when nothing is typed or a request is already in flight
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {/* Helper text explaining server-side normalisation */}
        <p className="text-xs text-gray-600 mt-2">Stored lowercase. Exact phrase match only.</p>
      </div>

      {/* ── Word list ─────────────────────────────────────────────────────────
          Renders as a wrapping flex row of "chips" — each chip shows the word
          and a small × button to remove it.  font-mono makes words easier to
          distinguish (especially for similar-looking characters like l/I/1). */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Banned words</h2>
          {/* Live count so the admin can see how many words are in the list */}
          <span className="text-xs text-gray-500">{words.length} total</span>
        </div>

        {words.length === 0 ? (
          /* Empty state — shown before any words have been added */
          <p className="text-gray-600 text-sm">No banned words yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <div
                key={w.id} // use the stable DB id, not the word string, as the React key
                className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5"
              >
                {/* Word displayed in a monospace font for readability */}
                <span className="text-sm text-gray-300 font-mono">{w.word}</span>
                {/* × button — calls remove with this word's DB id */}
                <button
                  onClick={() => remove(w.id)}
                  className="text-gray-600 hover:text-red-400 transition ml-1 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
