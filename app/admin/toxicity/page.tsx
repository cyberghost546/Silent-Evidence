'use client';
// app/admin/toxicity/page.tsx
//
// WHY 'use client'?
//   The scan is triggered by a button click and results stream back from an API call.
//   Dismiss/delete actions mutate local state. All of that needs useState, so this
//   must be a Client Component.
//
// PURPOSE:
//   AI-powered content moderation queue. When the admin clicks "Run AI Scan", this
//   page POSTs to /api/admin/toxicity, which sends recent comments/stories to Claude
//   for analysis and returns a list of items that may violate the site's policies.
//
//   Horror context: gore, dark themes, and disturbing fiction are ALLOWED on this site.
//   Claude is instructed to only flag real harassment, hate speech, or credible threats —
//   not fictional horror content.
//
// SCAN MODES:
//   'comments' — scan recent comments only
//   'stories'  — scan recent story excerpts only
//   'both'     — scan both (default for a thorough sweep)
//
// ITEM LIFECYCLE:
//   1. Claude flags an item with a severity (low/medium/high) and a reason string.
//   2. The admin sees the item in a card with the AI's reason shown in yellow.
//   3. Admin can:
//      a. Delete — fires a DELETE to the comment/story API endpoint, then hides the card.
//      b. Dismiss — hides the card locally (no API call, just marks the ID in `dismissed`).
//
// STATE:
//   flagged    — all items returned by the scan
//   dismissed  — Set<number> of IDs the admin has dismissed or deleted (client-side only)
//   visible    — flagged items minus dismissed ones (derived, not stored)
//   scanned    — total number of items the AI checked (shown in the subtitle)
//   scanning   — true while the POST is in-flight (shows a spinner on the button)
//
// SEV_STYLE:
//   A lookup map for severity → Tailwind badge classes.
//   Using a Record type avoids a chain of if/else for three cases.

import { useState } from 'react';

type FlaggedItem = {
  type: 'comment' | 'story';
  id: number;
  text: string;
  authorId: number;
  authorName: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
};

const SEV_STYLE: Record<string, string> = {
  high: 'bg-red-600/20 border-red-600/40 text-red-400',
  medium: 'bg-yellow-600/20 border-yellow-600/40 text-yellow-400',
  low: 'bg-gray-700/40 border-gray-600/40 text-gray-400',
};

export default function AdminToxicityPage() {
  const [mode, setMode] = useState<'comments' | 'stories' | 'both'>('comments');
  const [scanning, setScanning] = useState(false);
  const [flagged, setFlagged] = useState<FlaggedItem[]>([]);
  const [scanned, setScanned] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const scan = async () => {
    setScanning(true);
    setFlagged([]);
    setScanned(null);
    setDismissed(new Set());
    const res = await fetch('/api/admin/toxicity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    setFlagged(data.flagged ?? []);
    setScanned(data.scanned ?? 0);
    setScanning(false);
  };

  const deleteItem = async (item: FlaggedItem) => {
    // Route to the correct API based on whether this is a comment or a story
    const url =
      item.type === 'comment' ? `/api/admin/comments/${item.id}` : `/api/admin/stories/${item.id}`;
    await fetch(url, { method: 'DELETE' });
    // Hide from UI immediately after deletion — no need to re-scan
    setDismissed((prev) => new Set([...prev, item.id]));
  };

  // dismiss() hides a card locally without deleting content (false positive handling)
  const dismiss = (id: number) => setDismissed((prev) => new Set([...prev, id]));

  // visible is derived — compute it on every render from the two source-of-truth states
  const visible = flagged.filter((f) => !dismissed.has(f.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">AI Toxicity Queue</h1>
      <p className="text-gray-500 text-sm mb-6">
        Scan recent content with Claude to surface potential policy violations. Horror fiction
        (gore, dark themes) is allowed — only real harassment, hate speech, or threats are flagged.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(['comments', 'stories', 'both'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition capitalize ${mode === m ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={scan}
          disabled={scanning}
          className="px-5 py-2 text-sm font-semibold bg-purple-700 hover:bg-purple-600 text-white rounded-xl transition disabled:opacity-50 flex items-center gap-2"
        >
          {scanning ? (
            <>
              <span className="animate-spin inline-block">✦</span> Scanning…
            </>
          ) : (
            <>✦ Run AI Scan</>
          )}
        </button>
        {scanned !== null && (
          <span className="text-xs text-gray-500">
            Scanned {scanned} items — {flagged.length} flagged
          </span>
        )}
      </div>

      {/* Results */}
      {scanned !== null && visible.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white font-semibold">All clear</p>
          <p className="text-gray-500 text-sm mt-1">
            No policy violations found in the scanned content.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {visible.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 capitalize">
                    {item.type}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border capitalize ${SEV_STYLE[item.severity]}`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-xs text-gray-500">by {item.authorName}</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-3 mb-3">{item.text}</p>
                <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2">
                  {item.reason}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => deleteItem(item)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 transition"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-500 hover:text-white transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
