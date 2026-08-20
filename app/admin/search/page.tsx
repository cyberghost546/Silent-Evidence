'use client';
// app/admin/search/page.tsx
//
// WHY 'use client'?
//   Search is fully interactive — the query fires on button click (or Enter key),
//   results update asynchronously, and the loading state must be reflected in the UI.
//   All of that requires useState, so this must be a Client Component.
//
// PURPOSE:
//   A unified search bar for admins to find users, stories, or comments without
//   having to navigate to each section separately. Useful for quickly locating a
//   specific user to ban, or a comment to delete, from a single search field.
//
// API:
//   GET /api/admin/search?q=<query>
//   Returns `{ results: Result[] }` — each result has a type, label, sub-label,
//   and an `href` link so the admin can click through to the full record.
//
// UX PATTERN:
//   - `searched` flag distinguishes "haven't searched yet" (no message) from
//     "searched and got zero results" (shows "No results" empty state).
//   - Enter key triggers the same `search()` function as the button click via
//     `onKeyDown={e => e.key === 'Enter' && search()}`.
//
// ICONS / COLORS:
//   Two Record<string, string> lookup tables map the result type to an icon emoji
//   and a Tailwind colour class. Avoids a chain of if/else in the JSX.

import { useState } from 'react';
import { User, BookOpen, MessageSquare, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

// Result shape from the admin search API — includes a precomputed `href` for linking
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

  const ICONS: Record<string, LucideIcon> = { user: User, story: BookOpen, comment: MessageSquare };
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
              {(() => {
                const RIcon = ICONS[r.type] ?? BookOpen;
                return <RIcon className="w-5 h-5 shrink-0 text-gray-400" strokeWidth={1.5} aria-hidden="true" />;
              })()}
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
