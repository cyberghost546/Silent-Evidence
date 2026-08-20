'use client';
/**
 * app/admin/prompts/AdminPromptsClient.tsx
 * ─────────────────────────────────────────
 * PURPOSE:
 *   Admin panel for managing writing prompts — creative challenges shown to
 *   users on the site to inspire story submissions.
 *
 * TWO MODES:
 *   • AI Generate — sends a request to /api/writing-prompts (POST with empty body)
 *     which calls Claude to invent a fresh horror writing prompt automatically.
 *   • Manual — the admin types their own title and prompt text, then submits
 *     it to the same API endpoint with the text pre-filled.
 *
 * HOW IT WORKS:
 *   1. The parent server page fetches the 5 most recent prompts from the DB
 *      and passes them as `initialPrompts`.
 *   2. The admin picks a mode (AI or Manual) and clicks the action button.
 *   3. On success the new prompt is prepended to the local list and all
 *      previous prompts are marked inactive in local state (only one prompt
 *      is active at a time on the site).
 *   4. The prompt history below shows each prompt's entry count so the admin
 *      can see which prompts drove the most engagement.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - The "AI or Manual" mode toggle is a clean UX pattern for any feature
 *     that supports both automated and human-authored content.
 *   - The optimistic prepend + deactivate pattern keeps the UI snappy without
 *     needing a full page reload after each new prompt.
 */

import { useState } from 'react';
import { Bot, Pencil } from 'lucide-react';

// ── Type definitions ──────────────────────────────────────────────────────────

// Shape of a single writing prompt record
type Prompt = {
  id: number;
  title: string;         // short headline shown to users (e.g. "Weekend Prompt #5")
  prompt: string;        // the full creative writing challenge text
  active: boolean;       // only the active prompt is shown on the site homepage
  expiresAt: string | null; // optional ISO date — shown as a deadline to users
  createdAt: string;
  _count: { entries: number }; // how many stories have been submitted for this prompt
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPromptsClient({ initialPrompts }: { initialPrompts: Prompt[] }) {
  // Local prompt list — prepended when a new prompt is created
  const [prompts, setPrompts]       = useState<Prompt[]>(initialPrompts);

  // True while the API call is in flight (AI generation or manual save)
  const [generating, setGenerating] = useState(false);

  // Controlled inputs for the Manual mode form
  const [manualTitle, setManualTitle]   = useState('');
  const [manualPrompt, setManualPrompt] = useState('');

  // Which creation mode is active — 'ai' uses Claude; 'manual' uses the text inputs
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');

  // Error text shown below the form if the API returns a failure response
  const [error, setError] = useState('');

  // ── Generate / save a prompt ──────────────────────────────────────────────

  // Called when the admin clicks "Generate New Prompt" or "Save Prompt".
  // The same API endpoint handles both modes:
  //   - Empty body → server calls Claude to invent the prompt
  //   - Body with { title, prompt } → server saves the manual text directly
  const generate = async () => {
    setGenerating(true);
    setError('');

    // Build the request body based on the selected mode
    const body = mode === 'manual'
      ? { title: manualTitle, prompt: manualPrompt }
      : {}; // empty body signals the server to use AI generation

    const res = await fetch('/api/writing-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setGenerating(false);

    if (!res.ok) { setError(data.error ?? 'Failed'); return; }

    // Optimistically update the UI:
    // 1. Prepend the new prompt (with 0 entries since it's brand new)
    // 2. Mark all existing prompts as inactive (only one is active at a time)
    setPrompts(prev => [
      { ...data, _count: { entries: 0 } },
      ...prev.map(p => ({ ...p, active: false })),
    ]);

    // Clear the manual form inputs ready for next time
    setManualTitle('');
    setManualPrompt('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Writing Prompts</h1>

      {/* ── Mode toggle tabs ─────────────────────────────────────────────────
          Two buttons styled as a segmented control to switch between AI and Manual.
          The active mode gets a filled red background; the inactive one is outlined. */}
      <div className="flex gap-2 mb-5">
        {(['ai', 'manual'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition border ${
              mode === m ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white'
            }`}>
            {/* Show a Bot icon for AI mode and a Pencil icon for Manual mode */}
            {m === 'ai' ? <span className="inline-flex items-center gap-1.5"><Bot className="w-4 h-4" /> AI Generate</span> : <span className="inline-flex items-center gap-1.5"><Pencil className="w-4 h-4" /> Manual</span>}
          </button>
        ))}
      </div>

      {/* ── Manual mode inputs ───────────────────────────────────────────────
          Only rendered when mode === 'manual'.  The AI mode needs no inputs
          because the server generates everything automatically. */}
      {mode === 'manual' && (
        <div className="space-y-3 mb-4">
          <input
            value={manualTitle} onChange={e => setManualTitle(e.target.value)}
            placeholder="Prompt title (e.g. Weekend Prompt #5)"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          <textarea
            value={manualPrompt} onChange={e => setManualPrompt(e.target.value)}
            placeholder="Write the full prompt text here…"
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
      )}

      {/* Inline error message — only shown when the API returns an error */}
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {/* ── Action button ────────────────────────────────────────────────────
          Disabled while generating or if required Manual fields are empty.
          Label changes depending on mode and loading state. */}
      <button onClick={generate} disabled={generating || (mode === 'manual' && (!manualTitle || !manualPrompt))}
        className="mb-8 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition">
        {generating ? (mode === 'ai' ? 'Generating…' : 'Saving…') : (mode === 'ai' ? 'Generate New Prompt' : 'Save Prompt')}
      </button>

      {/* ── Prompt history ───────────────────────────────────────────────────
          Shows the most recent prompts so the admin can see entry counts and
          which one is currently active (red border + "Active" badge). */}
      <div className="space-y-4">
        {prompts.map(p => (
          // Active prompt gets a red border to stand out in the list
          <div key={p.id} className={`bg-gray-900 border rounded-xl p-5 ${p.active ? 'border-red-600/50' : 'border-gray-800'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* "Active" badge — only on the currently live prompt */}
                {p.active && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">Active</span>}
                {/* Entry count — how many stories have been submitted for this prompt */}
                <span className="text-xs text-gray-500">{p._count.entries} entries</span>
              </div>
            </div>
            {/* Full prompt text */}
            <p className="text-sm text-gray-400">{p.prompt}</p>
            {/* Expiry date — only shown if one was set */}
            {p.expiresAt && (
              <p className="text-xs text-gray-600 mt-2">Expires: {new Date(p.expiresAt).toLocaleDateString()}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
