'use client';
// app/admin/toxicity/page.tsx
// AI-powered content moderation queue — scans recent comments/stories with Claude
// and surfaces borderline content for a human admin to review.

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
  high:   'bg-red-600/20 border-red-600/40 text-red-400',
  medium: 'bg-yellow-600/20 border-yellow-600/40 text-yellow-400',
  low:    'bg-gray-700/40 border-gray-600/40 text-gray-400',
};

export default function AdminToxicityPage() {
  const [mode, setMode]       = useState<'comments' | 'stories' | 'both'>('comments');
  const [scanning, setScanning] = useState(false);
  const [flagged, setFlagged]   = useState<FlaggedItem[]>([]);
  const [scanned, setScanned]   = useState<number | null>(null);
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
    const url = item.type === 'comment'
      ? `/api/admin/comments/${item.id}`
      : `/api/admin/stories/${item.id}`;
    await fetch(url, { method: 'DELETE' });
    setDismissed(prev => new Set([...prev, item.id]));
  };

  const dismiss = (id: number) => setDismissed(prev => new Set([...prev, id]));

  const visible = flagged.filter(f => !dismissed.has(f.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">AI Toxicity Queue</h1>
      <p className="text-gray-500 text-sm mb-6">
        Scan recent content with Claude to surface potential policy violations. Horror fiction (gore, dark themes) is allowed — only real harassment, hate speech, or threats are flagged.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(['comments', 'stories', 'both'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition capitalize ${mode === m ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}>
              {m}
            </button>
          ))}
        </div>
        <button type="button" onClick={scan} disabled={scanning}
          className="px-5 py-2 text-sm font-semibold bg-purple-700 hover:bg-purple-600 text-white rounded-xl transition disabled:opacity-50 flex items-center gap-2">
          {scanning ? (
            <><span className="animate-spin inline-block">✦</span> Scanning…</>
          ) : (
            <>✦ Run AI Scan</>
          )}
        </button>
        {scanned !== null && (
          <span className="text-xs text-gray-500">Scanned {scanned} items — {flagged.length} flagged</span>
        )}
      </div>

      {/* Results */}
      {scanned !== null && visible.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-white font-semibold">All clear</p>
          <p className="text-gray-500 text-sm mt-1">No policy violations found in the scanned content.</p>
        </div>
      )}

      <div className="space-y-4">
        {visible.map(item => (
          <div key={`${item.type}-${item.id}`} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 capitalize">{item.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${SEV_STYLE[item.severity]}`}>{item.severity}</span>
                  <span className="text-xs text-gray-500">by {item.authorName}</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-3 mb-3">{item.text}</p>
                <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2">
                  🤖 {item.reason}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button type="button" onClick={() => deleteItem(item)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 transition">
                  Delete
                </button>
                <button type="button" onClick={() => dismiss(item.id)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-500 hover:text-white transition">
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
