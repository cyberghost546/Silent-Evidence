'use client';
import { useState } from 'react';

type Author = { id: number; username: string; isVerified: boolean; stories: number; followers: number };

export default function FeaturedAuthorsClient({ featured: initial }: { featured: Author[] }) {
  const [featured, setFeatured] = useState(initial);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Author[]>([]);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const lookup = async () => {
    if (!search.trim()) return;
    const res = await fetch(`/api/admin/featured-authors?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setResults(data.users ?? []);
  };

  const add = async (author: Author) => {
    if (featured.length >= 6) { flash('Max 6 featured authors.'); return; }
    if (featured.find(f => f.id === author.id)) { flash('Already featured.'); return; }
    const next = [...featured, author];
    setFeatured(next);
    setResults([]);
    setSearch('');
    await fetch('/api/admin/featured-authors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: next.map(a => a.id) }) });
    flash(`${author.username} added.`);
  };

  const remove = async (id: number) => {
    const next = featured.filter(a => a.id !== id);
    setFeatured(next);
    await fetch('/api/admin/featured-authors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: next.map(a => a.id) }) });
    flash('Removed.');
  };

  return (
    <div className="space-y-6">
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {/* Search */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Add author ({featured.length}/6)</h2>
        <div className="flex gap-3 mb-3">
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()} placeholder="Search by username…"
            className="flex-1 bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition" />
          <button onClick={lookup} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition">Search</button>
        </div>
        {results.length > 0 && (
          <div className="border border-gray-800 rounded-xl divide-y divide-gray-800">
            {results.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{u.username}{u.isVerified && <span className="text-blue-400 ml-1">✓</span>}</p>
                  <p className="text-xs text-gray-500">{u.stories} stories · {u.followers} followers</p>
                </div>
                <button onClick={() => add(u)} className="text-xs text-green-400 hover:text-green-300 transition">+ Feature</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current featured */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Currently featured</h2>
        {featured.length === 0 ? <p className="text-gray-600 text-sm">No featured authors set.</p> : (
          <div className="space-y-3">
            {featured.map((a, i) => (
              <div key={a.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-4">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{a.username}{a.isVerified && <span className="text-blue-400 ml-1 text-xs">✓</span>}</p>
                    <p className="text-xs text-gray-500">{a.stories} stories · {a.followers} followers</p>
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-xs text-red-400 hover:text-red-300 transition">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
