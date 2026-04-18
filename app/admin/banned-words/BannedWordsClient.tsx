'use client';
import { useState } from 'react';

type Word = { id: number; word: string; createdAt: string };

export default function BannedWordsClient({ words: initial }: { words: Word[] }) {
  const [words, setWords] = useState(initial);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const add = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    const res = await fetch('/api/admin/banned-words', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: input.trim() }),
    });
    if (res.ok) {
      const created = await res.json();
      setWords(w => [...w, created].sort((a, b) => a.word.localeCompare(b.word)));
      setInput('');
      flash('Word added.');
    }
    setLoading(false);
  };

  const remove = async (id: number) => {
    await fetch('/api/admin/banned-words', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setWords(w => w.filter(x => x.id !== id));
    flash('Word removed.');
  };

  return (
    <div className="space-y-6">
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {/* Add form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Add word or phrase</h2>
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="e.g. badword"
            className="flex-1 bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none transition"
          />
          <button
            onClick={add}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">Stored lowercase. Exact phrase match only.</p>
      </div>

      {/* List */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Banned words</h2>
          <span className="text-xs text-gray-500">{words.length} total</span>
        </div>
        {words.length === 0 ? (
          <p className="text-gray-600 text-sm">No banned words yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map(w => (
              <div key={w.id} className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">
                <span className="text-sm text-gray-300 font-mono">{w.word}</span>
                <button onClick={() => remove(w.id)} className="text-gray-600 hover:text-red-400 transition ml-1 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
