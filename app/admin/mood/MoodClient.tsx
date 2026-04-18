'use client';
import { useState } from 'react';

const MOODS = [
  { value: 'CREEPY', label: 'Creepy', icon: '🕷️' },
  { value: 'PARANOID', label: 'Paranoid', icon: '👁️' },
  { value: 'DISTURBING', label: 'Disturbing', icon: '😱' },
  { value: 'ATMOSPHERIC', label: 'Atmospheric', icon: '🌫️' },
  { value: 'PSYCHOLOGICAL', label: 'Psychological', icon: '🧠' },
  { value: 'SUPERNATURAL', label: 'Supernatural', icon: '👻' },
  { value: 'GORE', label: 'Gore', icon: '🩸' },
  { value: 'JUMPSCARE', label: 'Jumpscare', icon: '⚡' },
];

type MoodOfDay = { id: number; mood: string; message: string | null; setAt: string };

export default function MoodClient({ current, history }: { current: MoodOfDay | null; history: MoodOfDay[] }) {
  const [selected, setSelected] = useState(current?.mood ?? 'ATMOSPHERIC');
  const [message, setMessage] = useState(current?.message ?? '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/mood', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: selected, message }),
    });
    if (res.ok) { setMsg('Mood updated!'); setTimeout(() => setMsg(''), 3000); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {current && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Current mood</p>
          <p className="text-lg font-bold text-white">{MOODS.find(m => m.value === current.mood)?.icon} {current.mood}</p>
          {current.message && <p className="text-sm text-gray-400 mt-1">"{current.message}"</p>}
          <p className="text-xs text-gray-600 mt-2">Set {new Date(current.setAt).toLocaleString()}</p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Set new mood</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {MOODS.map(m => (
            <button key={m.value} onClick={() => setSelected(m.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition ${selected === m.value ? 'border-red-600 bg-red-600/10 text-white' : 'border-gray-800 bg-gray-800 text-gray-400 hover:border-gray-600'}`}>
              <span className="text-2xl">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Tagline (optional)</label>
          <input value={message} onChange={e => setMessage(e.target.value)} maxLength={100}
            placeholder="e.g. Something watches from the trees…"
            className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition" />
        </div>
        <button onClick={save} disabled={loading}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
          {loading ? 'Saving…' : 'Set mood'}
        </button>
      </div>

      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">History</h2>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{MOODS.find(m => m.value === h.mood)?.icon} {h.mood}{h.message ? ` — "${h.message}"` : ''}</span>
                <span className="text-xs text-gray-600">{new Date(h.setAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
