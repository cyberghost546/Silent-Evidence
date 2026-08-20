'use client';
// ============================================================
// FILE: AdminStoriesClient.tsx
// PURPOSE: Full-featured admin table for managing every story on the site.
//          Includes live search, status filter pills, bulk actions (publish /
//          archive / delete), per-row status dropdowns, a "Featured" toggle
//          (shows the story on the homepage hero), and a "Creepy of Month"
//          crown toggle.
//
// KEY CONCEPTS:
//   - useMemo: expensive filtering/sorting runs only when its dependencies
//     change, not on every render. Great for large lists.
//   - Bulk actions with Promise.all: fires all N fetch() calls simultaneously
//     rather than one-by-one, so bulk deletes finish much faster.
//   - Set<number> for selected rows: the Set data structure gives O(1)
//     has/add/delete instead of scanning an array each time.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Pass an array of story objects as the `stories` prop (from a server page).
//   - Update the API paths (/api/admin/stories/[id]) to match your own routes.
//   - The search + filter + sort pattern inside useMemo works for any list.
//   - Copy the bulk-action pattern (Promise.all + setBulkLoading) whenever you
//     need to apply the same operation to multiple items at once.
// ============================================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type Story = {
  id: number;
  title: string;
  slug: string;
  status: string;
  featured: boolean;
  creepyOfMonth: boolean;
  createdAt: Date;
  author: { username: string };
  category: { name: string };
  _count: { likes: number; comments: number };
};

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

// Tailwind classes for each status badge
const statusBadge: Record<string, string> = {
  PUBLISHED: 'bg-red-500/10 text-red-400 border-red-500/30',
  DRAFT:     'bg-gray-500/10  text-gray-400  border-gray-500/30',
  ARCHIVED:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminStoriesClient({ stories }: { stories: Story[] }) {
  const router = useRouter();

  // Which single story row is being saved/deleted
  const [loading, setLoading] = useState<number | null>(null);

  // Set of selected story IDs for bulk actions
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Whether a bulk action is in progress
  const [bulkLoading, setBulkLoading] = useState(false);

  // Search/filter state
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Filter stories by search + status ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return stories.filter(s =>
      (!q || s.title.toLowerCase().includes(q) || s.author.username.toLowerCase().includes(q) || s.category.name.toLowerCase().includes(q)) &&
      (!statusFilter || s.status === statusFilter)
    );
  }, [stories, search, statusFilter]);

  // ── Checkbox helpers ──

  // Toggle one story in/out of selected set
  const toggleSelect = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Select/deselect all visible rows
  const toggleAll = () =>
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)));

  // ── Single-row actions ──────────────────────────────────────────

  const changeStatus = async (storyId: number, status: string) => {
    setLoading(storyId);
    await fetch(`/api/admin/stories/${storyId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLoading(null); router.refresh();
  };

  const toggleFeatured = async (storyId: number, current: boolean) => {
    setLoading(storyId);
    await fetch(`/api/admin/stories/${storyId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !current }),
    });
    setLoading(null); router.refresh();
  };

  const setCreepyOfMonth = async (storyId: number) => {
    setLoading(storyId);
    await fetch('/api/admin/creepy-of-month', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId }),
    });
    setLoading(null); router.refresh();
  };

  const deleteStory = async (storyId: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setLoading(storyId);
    await fetch(`/api/admin/stories/${storyId}`, { method: 'DELETE' });
    setLoading(null); router.refresh();
  };

  // ── Bulk actions ────────────────────────────────────────────────
  // Applies the same action to all selected stories via parallel fetch calls

  const bulkAction = async (action: 'PUBLISHED' | 'ARCHIVED' | 'DELETE') => {
    if (selected.size === 0) return;
    const label = action === 'DELETE' ? 'delete' : `set to ${action}`;
    if (!confirm(`${label} ${selected.size} stories?`)) return;

    setBulkLoading(true);

    // Run all requests in parallel for speed
    await Promise.all([...selected].map(id =>
      action === 'DELETE'
        ? fetch(`/api/admin/stories/${id}`, { method: 'DELETE' })
        : fetch(`/api/admin/stories/${id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action }),
          })
    ));

    setSelected(new Set());
    setBulkLoading(false);
    router.refresh();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Search + filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by title, author, or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600/60 transition"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">✕</button>}
        </div>
        <div className="flex items-center gap-2">
          {['', ...STATUSES].map(s => (
            <button key={s || 'ALL'} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${statusFilter === s ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk action bar — only shown when rows are selected ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-green-950/20 border border-red-800/40 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-red-300">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            {/* Publish selected */}
            <button onClick={() => bulkAction('PUBLISHED')} disabled={bulkLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 disabled:opacity-50 transition">
              ✓ Publish
            </button>
            {/* Archive selected */}
            <button onClick={() => bulkAction('ARCHIVED')} disabled={bulkLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-600/20 border border-yellow-600/40 text-yellow-400 hover:bg-yellow-600/30 disabled:opacity-50 transition">
 Archive
            </button>
            {/* Delete selected */}
            <button onClick={() => bulkAction('DELETE')} disabled={bulkLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 disabled:opacity-50 transition">
 Delete
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-white ml-1">Clear</button>
          </div>
        </div>
      )}

      {/* Result count */}
      <p className="text-xs text-gray-500">
        Showing <span className="text-white font-semibold">{filtered.length}</span> of {stories.length} stories
      </p>

      {/* ── Table ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(34,197,94,0.1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider bg-gray-950/50">
                {/* Select-all checkbox */}
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="accent-red-600 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">★</th>
                <th className="px-4 py-3 text-center"></th>
                <th className="px-4 py-3 text-center"></th>
                <th className="px-4 py-3 text-center"></th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center text-gray-500">
                    <p>No stories match your search.</p>
                  </td>
                </tr>
              ) : filtered.map((story) => (
                <tr key={story.id}
                  className={`hover:bg-gray-800/30 transition ${selected.has(story.id) ? 'bg-green-950/10' : ''}`}>

                  {/* Row checkbox */}
                  <td className="px-4 py-3">
                    <input type="checkbox"
                      checked={selected.has(story.id)}
                      onChange={() => toggleSelect(story.id)}
                      className="accent-red-600 cursor-pointer"
                    />
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3 max-w-xs">
                    <Link href={`/story/${story.slug}`} target="_blank"
                      className="text-white hover:text-red-400 transition font-medium line-clamp-1">
                      {story.title}
                    </Link>
                  </td>

                  <td className="px-4 py-3 text-gray-400 text-xs">{story.author.username}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{story.category.name}</td>

                  {/* Status dropdown */}
                  <td className="px-4 py-3">
                    <select value={story.status} disabled={loading === story.id}
                      onChange={(e) => changeStatus(story.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border bg-transparent cursor-pointer focus:outline-none ${statusBadge[story.status]}`}>
                      {STATUSES.map(s => <option key={s} value={s} className="bg-gray-900 text-white">{s}</option>)}
                    </select>
                  </td>

                  {/* Featured ★ */}
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleFeatured(story.id, story.featured)} disabled={loading === story.id}
                      className={`text-lg transition disabled:opacity-40 ${story.featured ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}>★</button>
                  </td>

                  {/* Creepy of Month 👑 */}
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setCreepyOfMonth(story.id)} disabled={loading === story.id}
                      className={`text-lg transition disabled:opacity-40 ${story.creepyOfMonth ? 'text-red-400' : 'text-gray-600 hover:text-red-400'}`}></button>
                  </td>

                  <td className="px-4 py-3 text-center text-gray-400 text-xs">{story._count.likes}</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">{story._count.comments}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(story.createdAt).toLocaleDateString()}</td>

                  {/* Delete */}
                  <td className="px-4 py-3 text-right">
                    {loading === story.id ? (
                      <span className="text-xs text-gray-500 animate-pulse">Saving…</span>
                    ) : (
                      <button onClick={() => deleteStory(story.id, story.title)}
                        className="text-xs px-3 py-1 rounded-lg border border-red-800/40 text-red-500 hover:bg-red-600/10 hover:border-red-600/60 transition">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
