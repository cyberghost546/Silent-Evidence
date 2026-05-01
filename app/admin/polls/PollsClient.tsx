'use client';
// app/admin/polls/PollsClient.tsx
//
// WHY 'use client'?
//   The poll creation form (dynamic option inputs), the close/delete actions, and
//   the live results all require useState — these only work in Client Components.
//
// PURPOSE:
//   Manage site-wide polls visible on the homepage or category pages.
//   The admin can create a poll with a question, 2+ options, and an optional
//   end date. Running polls show live vote counts. Closing a poll sets `endsAt`
//   to now (immediately stops accepting votes). Deleting removes it entirely.
//
// STATE:
//   polls    — the local list of polls, mutated optimistically after each action
//   question — the question text for the new poll being created
//   options  — array of option strings; starts with two empty strings, more can be added
//   endsAt   — optional ISO date string for when the poll closes automatically
//   creating — disables the Create button while the POST is in-flight
//   msg      — 3-second flash message after each action
//
// DYNAMIC OPTIONS:
//   `options` is an array where each element is one option text input.
//   `addOption()` appends an empty string (adds a new input row).
//   `setOption(i, v)` updates the value at index i (controlled input pattern).
//   `validOpts` filters out empty strings before submitting — blank options are ignored.
//
// CLOSE vs DELETE:
//   `close()` — sets endsAt to now via PATCH (poll stays visible with final results)
//   `del()`   — deletes the poll entirely via DELETE (native confirm() guard)
//
// OPTIMISTIC UPDATES:
//   After create: prepend the new poll to local state immediately.
//   After close:  update the closed poll's endsAt in-place via .map().
//   After delete: remove the poll from the array via .filter().

import { useState } from 'react';

// Option shape — each poll option with its vote count from Prisma's _count
type Option = { id: number; text: string; _count: { votes: number } };
// Poll shape — includes the options array and total vote count
type Poll = { id: number; question: string; endsAt: string | null; createdAt: string; _count: { votes: number }; options: Option[] };

export default function PollsClient({ polls: initial }: { polls: Poll[] }) {
  const [polls, setPolls] = useState(initial);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']); // start with 2 empty option inputs
  const [endsAt, setEndsAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  // addOption appends a new empty text input to the options array
  const addOption = () => setOptions(o => [...o, '']);
  // setOption updates the value of the i-th option input
  const setOption = (i: number, v: string) => setOptions(o => o.map((x, idx) => idx === i ? v : x));

  const create = async () => {
    // Filter out blank option inputs before submitting
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) { flash('Need a question and at least 2 options.'); return; }
    setCreating(true);
    const res = await fetch('/api/admin/polls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options: validOpts, endsAt: endsAt || null }),
    });
    if (res.ok) {
      const newPoll = await res.json();
      setPolls(p => [newPoll, ...p]);
      setQuestion(''); setOptions(['', '']); setEndsAt('');
      flash('Poll created!');
    }
    setCreating(false);
  };

  const close = async (id: number) => {
    await fetch('/api/admin/polls', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, endsAt: new Date().toISOString() }) });
    setPolls(p => p.map(x => x.id === id ? { ...x, endsAt: new Date().toISOString() } : x));
    flash('Poll closed.');
  };

  const del = async (id: number) => {
    if (!confirm('Delete this poll?')) return;
    await fetch('/api/admin/polls', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setPolls(p => p.filter(x => x.id !== id));
    flash('Deleted.');
  };

  return (
    <div className="space-y-6">
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {/* Create form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Create poll</h2>
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Question…"
          className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition mb-3" />
        <div className="space-y-2 mb-3">
          {options.map((o, i) => (
            <input key={i} value={o} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
              className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2 text-white text-sm outline-none transition" />
          ))}
        </div>
        <div className="flex gap-3 mb-4">
          <button onClick={addOption} className="text-xs text-gray-400 hover:text-white transition">+ Add option</button>
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Closes at (optional)</label>
          <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm outline-none" />
        </div>
        <button onClick={create} disabled={creating} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
          {creating ? 'Creating…' : 'Create poll'}
        </button>
      </div>

      {/* Poll list */}
      {polls.map(p => {
        const closed = p.endsAt ? new Date(p.endsAt) <= new Date() : false;
        const total = p._count.votes;
        return (
          <div key={p.id} className={`bg-gray-900 border rounded-2xl p-6 ${closed ? 'border-gray-800' : 'border-red-600/20'}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-semibold text-white">{p.question}</p>
                <p className="text-xs text-gray-500 mt-0.5">{total} votes · {closed ? <span className="text-gray-600">Closed</span> : <span className="text-green-400">Open</span>}</p>
              </div>
              <div className="flex gap-2">
                {!closed && <button onClick={() => close(p.id)} className="text-xs text-yellow-400 hover:text-yellow-300 transition">Close</button>}
                <button onClick={() => del(p.id)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
              </div>
            </div>
            <div className="space-y-2">
              {p.options.map(o => {
                const pct = total > 0 ? Math.round((o._count.votes / total) * 100) : 0;
                return (
                  <div key={o.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{o.text}</span>
                      <span className="text-gray-500">{o._count.votes} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {polls.length === 0 && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center text-gray-600">No polls yet.</div>}
    </div>
  );
}
