'use client';
/**
 * app/admin/mood/MoodClient.tsx
 * ──────────────────────────────
 * PURPOSE:
 *   Admin control for setting the site's "Mood of the Day" — a global emotional
 *   tone (e.g. Creepy, Paranoid, Gore) displayed on the homepage to set the
 *   atmosphere for readers.  An optional tagline accompanies the mood.
 *
 * HOW IT FITS WITH THE PARENT PAGE:
 *   The parent server page (`app/admin/mood/page.tsx`) pre-fetches:
 *     • `current` — the most recently set mood record (or null if none).
 *     • `history` — previous mood entries for reference.
 *   These are passed as props so the component renders with real data immediately,
 *   no client-side fetch on mount.
 *
 * STATE MODEL:
 *   selected — the mood enum value the admin has clicked (e.g. 'CREEPY').
 *              Initialised to the current mood so the UI reflects what's live.
 *   message  — optional free-text tagline (max 100 chars) shown below the mood icon.
 *              Also initialised from the current mood's message.
 *   loading  — true while the POST /api/admin/mood call is in flight; disables the
 *              "Set mood" button to prevent duplicate submissions.
 *   msg      — temporary success banner text; auto-cleared after 3 seconds.
 *
 * API CALL:
 *   POST /api/admin/mood  { mood: string, message: string }
 *   The server creates a new MoodOfDay record and marks it as the active mood.
 *   It does NOT update `current` or `history` — a page refresh is needed to
 *   see those updated, but the admin sees a success banner as confirmation.
 *
 * MOOD GRID LAYOUT:
 *   Uses `grid grid-cols-2 sm:grid-cols-4` so the 8 mood buttons sit in a
 *   responsive 2-column mobile / 4-column desktop grid.  The selected mood
 *   gets a red border and red background tint to stand out visually.
 */

import { useState } from 'react';

// ── Mood definitions ──────────────────────────────────────────────────────────

// Each entry maps the database enum value to a human-readable label and emoji icon.
// The icon is rendered large (text-2xl) inside the mood grid buttons so admins
// can quickly identify moods at a glance without reading the label.
const MOODS = [
  { value: 'CREEPY',        label: 'Creepy',        icon: '🕷️' },
  { value: 'PARANOID',      label: 'Paranoid',      icon: '👁️' },
  { value: 'DISTURBING',    label: 'Disturbing',    icon: '😱' },
  { value: 'ATMOSPHERIC',   label: 'Atmospheric',   icon: '🌫️' },
  { value: 'PSYCHOLOGICAL', label: 'Psychological', icon: '🧠' },
  { value: 'SUPERNATURAL',  label: 'Supernatural',  icon: '👻' },
  { value: 'GORE',          label: 'Gore',           icon: '🩸' },
  { value: 'JUMPSCARE',     label: 'Jumpscare',     icon: '⚡' },
];

// ── Type definitions ──────────────────────────────────────────────────────────

// Shape of a single mood record as returned by the server / Prisma
type MoodOfDay = {
  id: number;
  mood: string;           // one of the MOODS value strings (e.g. 'CREEPY')
  message: string | null; // optional tagline — null if the admin left it blank
  setAt: string;          // ISO date string — when this mood was saved
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MoodClient({
  current,   // the currently active mood (or null if none set yet)
  history,   // previous mood entries — shown in the history list below
}: {
  current: MoodOfDay | null;
  history: MoodOfDay[];
}) {
  // Which mood button is currently highlighted in the grid.
  // Falls back to 'ATMOSPHERIC' if no current mood exists yet.
  const [selected, setSelected] = useState(current?.mood ?? 'ATMOSPHERIC');

  // Controlled value for the optional tagline input.
  // Pre-filled with the current mood's message so the admin can tweak it.
  const [message, setMessage] = useState(current?.message ?? '');

  // Disables the submit button while the POST request is in flight.
  const [loading, setLoading] = useState(false);

  // Short success feedback string — displayed in a green banner, auto-clears after 3 s.
  const [msg, setMsg] = useState('');

  // ── Save the new mood ──────────────────────────────────────────────────────

  // POSTs the selected mood enum value and optional message to the API.
  // The server creates a new MoodOfDay row and sets it as the active mood.
  const save = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: selected, message }),
    });
    if (res.ok) {
      setMsg('Mood updated!');
      // Auto-dismiss the success banner after 3 seconds
      setTimeout(() => setMsg(''), 3000);
    }
    setLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Feedback banner ─────────────────────────────────────────────────
          Only rendered when `msg` is non-empty.  Uses a subtle green tint
          so it's visible but not alarming. */}
      {msg && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">
          {msg}
        </div>
      )}

      {/* ── Current mood card ────────────────────────────────────────────────
          Only rendered if a mood has been set before (current !== null).
          Shows the emoji icon, mood label, optional message, and when it was set. */}
      {current && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Current mood</p>
          {/* MOODS.find() maps the DB value string to the emoji icon from our constant */}
          <p className="text-lg font-bold text-white">
            {MOODS.find(m => m.value === current.mood)?.icon} {current.mood}
          </p>
          {/* Optional tagline — only rendered if the admin set one */}
          {current.message && (
            <p className="text-sm text-gray-400 mt-1">"{current.message}"</p>
          )}
          {/* When the mood was last updated — toLocaleString uses the browser's locale */}
          <p className="text-xs text-gray-600 mt-2">
            Set {new Date(current.setAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* ── Set new mood panel ───────────────────────────────────────────────
          Grid of 8 mood buttons + optional tagline input + submit button. */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Set new mood</h2>

        {/* Mood picker grid — 2 columns on mobile, 4 on sm+ screens.
            Each button is a flex column with a large emoji and a text label.
            The selected button gets a red border and a faint red background tint. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => setSelected(m.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition ${
                selected === m.value
                  ? 'border-red-600 bg-red-600/10 text-white'   // active: red highlight
                  : 'border-gray-800 bg-gray-800 text-gray-400 hover:border-gray-600'  // inactive
              }`}
            >
              {/* Large emoji icon — easier to click/scan than text alone */}
              <span className="text-2xl">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Optional tagline input — what gets displayed on the homepage below the mood icon.
            maxLength={100} is enforced by the browser as well as the server. */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Tagline (optional)</label>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={100}
            placeholder="e.g. Something watches from the trees…"
            className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition"
          />
        </div>

        {/* Submit button — disabled while the API call is in flight */}
        <button
          onClick={save}
          disabled={loading}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Set mood'}
        </button>
      </div>

      {/* ── Mood history ─────────────────────────────────────────────────────
          Only rendered when there is at least one history entry.
          Shows each past mood with its tagline (if any) and the date it was set. */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">History</h2>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                {/* Icon + mood name + optional tagline in one line */}
                <span className="text-gray-300">
                  {MOODS.find(m => m.value === h.mood)?.icon} {h.mood}
                  {h.message ? ` — "${h.message}"` : ''}
                </span>
                {/* Short date — toLocaleDateString omits the time for a cleaner look */}
                <span className="text-xs text-gray-600">
                  {new Date(h.setAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
