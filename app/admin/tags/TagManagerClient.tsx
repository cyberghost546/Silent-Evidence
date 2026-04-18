'use client';
import { useState } from 'react';

type Tag = { id: number; name: string; slug: string; storyCount: number };

export default function TagManagerClient({ tags: initial }: { tags: Tag[] }) {
  const [tags, setTags] = useState(initial);
  const [filter, setFilter] = useState<'all' | 'unused'>('all');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const del = async (id: number, name: string) => {
    if (!confirm(`Delete tag "${name}"?`)) return;
    const res = await fetch('/api/admin/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) { setTags(t => t.filter(x => x.id !== id)); flash(`Tag "${name}" deleted.`); }
  };

  const visible = tags
    .filter(t => filter === 'unused' ? t.storyCount === 0 : true)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tags…"
          className="flex-1 min-w-48 bg-gray-900 border border-gray-800 focus:border-red-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition" />
        <div className="flex gap-2">
          {(['all', 'unused'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${filter === f ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f === 'all' ? `All (${tags.length})` : `Unused (${tags.filter(t => t.storyCount === 0).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <th className="px-5 py-3">Tag</th><th className="px-5 py-3">Slug</th>
            <th className="px-5 py-3">Stories</th><th className="px-5 py-3 text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-800">
            {visible.map(t => (
              <tr key={t.id} className="hover:bg-gray-800/40 transition">
                <td className="px-5 py-3 text-white font-medium">#{t.name}</td>
                <td className="px-5 py-3 text-gray-500 text-xs font-mono">{t.slug}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-bold ${t.storyCount === 0 ? 'text-gray-600' : 'text-white'}`}>{t.storyCount}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => del(t.id, t.name)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-600">No tags found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
