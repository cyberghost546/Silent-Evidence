'use client';
// app/components/ui/ConfessionBooth.tsx
// Interactive confession feed where users can post short anonymous (or named) confessions
// and react to others with horror-themed emoji (😱 💀 👻 🕯️).
// Fetches confessions from GET /api/confessions on mount, then re-fetches after each post or react.
// Posting hits POST /api/confessions; reactions hit POST /api/confessions/react.
// To reuse: drop <ConfessionBooth /> on any page — no props needed.

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { UserRound, Droplet } from 'lucide-react';
import { CONFESSION_REACTIONS } from '@/lib/reactions';

interface Confession {
  id: number;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  author: { username: string; avatar: string | null } | null;
  reactionCounts: Record<string, number>;
}

// Reaction set lives in lib/reactions — see the note there on why the stored
// ids still look like emoji even though nothing renders them any more.
const MAX_CHARS = 500;

export default function ConfessionBooth() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [draft, setDraft] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/confessions');
      const data = await res.json();
      setConfessions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (draft.trim().length < 5) { setError('Too short — bare your soul a little more.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/confessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft, isAnonymous }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to post');
        return;
      }
      setDraft('');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function react(confessionId: number, emoji: string) {
    await fetch('/api/confessions/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confessionId, emoji }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {/* Compose box */}
      <div className="relative">
        <div className="absolute -inset-px rounded-2xl bg-linear-to-b from-red-900/40 to-transparent opacity-70 blur-sm" />
        <div className="absolute inset-0 rounded-2xl shadow-[0_0_60px_rgba(220,38,38,0.25)]" />
        <div className="relative bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 font-medium">Your confession</span>
          </div>

          <textarea
            className="w-full bg-gray-950 text-gray-100 rounded-xl p-4 resize-none border border-gray-700
                       focus:outline-none focus:border-red-800 placeholder-gray-600 text-sm leading-relaxed"
            rows={4}
            maxLength={MAX_CHARS}
            placeholder="I once read a horror story alone at 3am and... I'm still not over it."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            suppressHydrationWarning
          />

          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="accent-red-700 w-4 h-4"
              />
              <span className="text-gray-400 text-sm">Post anonymously</span>
            </label>

            <div className="flex items-center gap-3">
              <span className={`text-xs ${draft.length > MAX_CHARS * 0.9 ? 'text-red-400' : 'text-gray-600'}`}>
                {draft.length}/{MAX_CHARS}
              </span>
              <button
                onClick={submit}
                disabled={submitting || draft.trim().length < 5}
                className="px-5 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                           text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? 'Confessing…' : 'Confess'}
              </button>
            </div>
          </div>

          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
        </div>
      </div>

      {/* Feed */}
      {loading && (
        <div className="text-center py-12 text-gray-600">Loading confessions…</div>
      )}

      {!loading && confessions.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p>No confessions yet. Be the first to whisper into the dark.</p>
        </div>
      )}

      <div className="space-y-4">
        {confessions.map((c) => (
          <div
            key={c.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
          >
            {/* Author line */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-sm">
                {c.isAnonymous
                ? <UserRound className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                : <Droplet className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />}
              </div>
              <span className="text-gray-500 text-sm">
                {c.isAnonymous || !c.author ? 'Anonymous' : c.author.username}
              </span>
              <span className="text-gray-700 text-xs ml-auto">
                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
              </span>
            </div>

            {/* Content */}
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>

            {/* Reactions */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {CONFESSION_REACTIONS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => react(c.id, id)}
                  title={label}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700
                             border border-gray-700 hover:border-gray-600 transition-colors text-sm"
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                  {(c.reactionCounts[id] ?? 0) > 0 && (
                    <span className="text-gray-400 text-xs">{c.reactionCounts[id]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
