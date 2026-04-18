'use client';
// app/admin/search/page.tsx — Unified admin search across users, stories, comments
import { useState } from 'react';
import Link from 'next/link';

type Result = { type: 'user' | 'story' | 'comment'; id: number; label: string; sub: string; href: string };

export default function AdminSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setSearched(false);
    const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setSearched(true); setLoading(false);
  };

  const ICONS: Record<string, string> = { user: '👤', story: '📖', comment: '💬' };
  const COLORS: Record<string, string> = { user: 'text-blue-400', story: 'text-red-400', comment: 'text-yellow-400' };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Admin Search</h1>
      <p className="text-gray-500 text-sm mb-8">Search users, stories, and comments from one place.</p>

      <div className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search username, story title, comment text…"
          className="flex-1 bg-gray-900 border border-gray-800 focus:border-red-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition"
        />
        <button onClick={search} disabled={loading || !query.trim()}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {searched && results.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center text-gray-500">No results for "{query}"</div>
      )}

      {results.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
          {results.map((r, i) => (
            <Link key={i} href={r.href} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/50 transition">
              <span className="text-xl flex-shrink-0">{ICONS[r.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{r.label}</p>
                <p className="text-xs text-gray-500 truncate">{r.sub}</p>
              </div>
              <span className={`text-xs font-bold uppercase ${COLORS[r.type]}`}>{r.type}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
