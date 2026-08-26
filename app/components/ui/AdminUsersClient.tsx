'use client';
// ============================================================
// FILE: AdminUsersClient.tsx
// PURPOSE: Full admin table for every registered user on the site.
//          Includes live search (by ID, username, or email), role filter pills,
//          sortable column headers, summary stat cards, a role dropdown per row,
//          a verify/unverify toggle, and a delete button.
//
// KEY CONCEPTS:
//   - useMemo with filter + sort: the filtered list is derived from state rather
//     than stored separately. It recalculates automatically when search,
//     roleFilter, sortBy, or sortDir change — no redundant setState needed.
//   - Role badges as a Record<string, string>: mapping role → Tailwind classes
//     is cleaner than a big if/else chain and easy to extend with new roles.
//   - Sortable columns: a single handleSort function checks whether the clicked
//     column is already active — if yes it flips direction, otherwise it changes
//     the column and resets to ascending.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Pass users from a server component as the `users` prop.
//   - Adjust the ROLES constant and roleBadge map to match your own role system.
//   - The filter + sort pattern inside useMemo is a reusable recipe for any
//     searchable, filterable, sortable table.
// ============================================================

import { useState, useMemo } from 'react';
import { Crown, PenLine, User, Ghost, Users, Zap, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCsrfToken } from '@/lib/getCsrfToken';

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  isPremium: boolean;
  createdAt: Date;
  _count: { stories: number; comments: number };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ['USER', 'AUTHOR', 'ADMIN', 'GUEST'];

// Tailwind classes for each role badge color
const roleBadge: Record<string, string> = {
  ADMIN:  'bg-red-600/20 text-red-400 border-red-600/40',
  AUTHOR: 'bg-blue-600/20 text-blue-400 border-blue-600/40',
  USER:   'bg-gray-600/20 text-gray-400 border-gray-600/40',
  GUEST:  'bg-yellow-600/20 text-yellow-400 border-yellow-600/40',
};

// Role icons shown in the table
const roleIcon: Record<string, LucideIcon> = {
  ADMIN: Crown, AUTHOR: PenLine, USER: User, GUEST: Ghost,
};

// RoleIcon — small helper so the icon can be dropped inline next to a role name.
function RoleIcon({ role, className }: { role: string; className?: string }) {
  const Icon = roleIcon[role];
  if (!Icon) return null;
  return <Icon className={className ?? 'w-3.5 h-3.5 inline-block'} strokeWidth={1.75} aria-hidden="true" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminUsersClient({ users }: { users: User[] }) {
  const router = useRouter();

  // Which user is currently being saved/deleted (shows a spinner)
  const [loading, setLoading]     = useState<number | null>(null);
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () =>
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(u => u.id)));

  // Search box input value
  const [search, setSearch]       = useState('');

  const [roleFilter, setRoleFilter] = useState('');
  const [premiumOnly, setPremiumOnly] = useState(false);

  // Which column to sort by and in what direction
  const [sortBy, setSortBy]       = useState<'id' | 'username' | 'stories' | 'comments' | 'joined'>('id');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');

  // ── Filter + sort the users list whenever search/filter/sort changes ──
  const filtered = [...users]
    .filter(u => {
      const q = search.toLowerCase();
      return (
        !q ||
        String(u.id).includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    })
    .filter(u => !roleFilter || u.role === roleFilter)
    .filter(u => !premiumOnly || u.isPremium)
    .sort((a, b) => {
      let val = 0;
      if (sortBy === 'id')       val = a.id - b.id;
      if (sortBy === 'username') val = a.username.localeCompare(b.username);
      if (sortBy === 'stories')  val = a._count.stories - b._count.stories;
      if (sortBy === 'comments') val = a._count.comments - b._count.comments;
      if (sortBy === 'joined')   val = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? val : -val;
    });

  // Clicking a column header toggles sort direction or switches column
  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // Sort indicator arrow shown next to column header
  const arrow = (col: typeof sortBy) =>
    sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── API calls ──────────────────────────────────────────────────────────────

  const changeRole = async (userId: number, role: string) => {
    setLoading(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': await getCsrfToken() },
      body: JSON.stringify({ role }),
    });
    setLoading(null);
    // Surface the owner / last-admin protection (409) instead of silently
    // refreshing as if nothing happened.
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? 'Could not change role.');
    }
    router.refresh();
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setLoading(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': await getCsrfToken() },
    });
    setLoading(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? 'Could not delete user.');
    }
    router.refresh();
  };

  const bulkAction = async (action: 'DELETE' | 'BAN' | 'SUSPEND') => {
    if (selected.size === 0) return;
    const label = action === 'DELETE' ? 'Delete' : action === 'BAN' ? 'Ban' : 'Suspend';
    if (!confirm(`${label} ${selected.size} users?`)) return;
    setBulkLoading(true);
    const token = await getCsrfToken();
    await Promise.all([...selected].map(id => {
      if (action === 'DELETE') return fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': token },
      });
      return fetch('/api/admin/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ userId: id, action, reason: `Bulk ${label.toLowerCase()} by admin` }),
      });
    }));
    setBulkLoading(false);
    setSelected(new Set());
    router.refresh();
  };

  // Toggle the verified author badge for a user
  const toggleVerify = async (userId: number) => {
    setLoading(userId);
    await fetch(`/api/admin/users/${userId}/verify`, { method: 'PATCH' });
    setLoading(null);
    router.refresh();
  };

  // ── Summary stats shown at the top ────────────────────────────────────────
  const stats = useMemo(() => ({
    total:   users.length,
    admins:  users.filter(u => u.role === 'ADMIN').length,
    authors: users.filter(u => u.role === 'AUTHOR').length,
    premium: users.filter(u => u.isPremium).length,
  }), [users]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',  value: stats.total,   color: 'text-white',       icon: Users },
          { label: 'Admins',       value: stats.admins,  color: 'text-red-400',     icon: Crown },
          { label: 'Authors',      value: stats.authors, color: 'text-blue-400',    icon: PenLine },
          { label: 'Premium',      value: stats.premium, color: 'text-yellow-400',  icon: Zap },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(34,197,94,0.1)]">
            <Icon className={`w-6 h-6 shrink-0 ${color}`} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + role filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search input — filters by ID, username, or email */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by ID, username or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            suppressHydrationWarning
            className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600/60 transition"
          />
          {/* Clear button — only shown when there is text */}
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition">✕</button>
          )}
        </div>

        {/* Role filter pills + Premium pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {['', ...ROLES].map(r => (
            <button
              key={r || 'ALL'}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                roleFilter === r && !premiumOnly
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {r || 'All'} {r && <RoleIcon role={r} />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setPremiumOnly(v => !v); setRoleFilter(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
              premiumOnly
                ? 'bg-yellow-500 border-yellow-500 text-black'
                : 'border-gray-700 text-gray-400 hover:border-yellow-500/60 hover:text-yellow-400'
            }`}
          >
 Premium
          </button>
        </div>
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-gray-500">
        Showing <span className="text-white font-semibold">{filtered.length}</span> of {users.length} users
        {search && <> matching <span className="text-red-400">"{search}"</span></>}
      </p>

      {/* ── Bulk action bar — shown when rows are selected ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl">
          <span className="text-sm font-semibold text-red-300">{selected.size} selected</span>
          <button type="button" onClick={() => bulkAction('SUSPEND')} disabled={bulkLoading} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-600/20 border border-yellow-600/40 text-yellow-400 hover:bg-yellow-600/30 transition disabled:opacity-50">
            Suspend
          </button>
          <button type="button" onClick={() => bulkAction('BAN')} disabled={bulkLoading} className="text-xs px-3 py-1.5 rounded-lg bg-orange-600/20 border border-orange-600/40 text-orange-400 hover:bg-orange-600/30 transition disabled:opacity-50">
            Ban
          </button>
          <button type="button" onClick={() => bulkAction('DELETE')} disabled={bulkLoading} className="text-xs px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 transition disabled:opacity-50">
            Delete
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-500 hover:text-white transition">Clear</button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(34,197,94,0.1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider bg-gray-950/50">

                {/* Select-all checkbox */}
                <th className="px-4 py-3 w-8" aria-label="Select all">
                  <input type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    aria-label="Select all users"
                    className="accent-red-500 cursor-pointer"
                  />
                </th>
                {/* Sortable column headers */}
                {[
                  { key: 'id',       label: 'ID',       align: 'left'   },
                  { key: 'username', label: 'User',     align: 'left'   },
                  { key: null,       label: 'Email',    align: 'left'   },
                  { key: null,       label: 'Role',     align: 'left'   },
                  { key: 'stories',  label: 'Stories',  align: 'center' },
                  { key: 'comments', label: 'Comments', align: 'center' },
                  { key: 'joined',   label: 'Joined',   align: 'left'   },
                  { key: null,       label: 'Actions',  align: 'right'  },
                ].map(({ key, label, align }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-${align} ${key ? 'cursor-pointer hover:text-white select-none' : ''} transition`}
                    onClick={key ? () => handleSort(key as typeof sortBy) : undefined}
                  >
                    {label}{key ? arrow(key as typeof sortBy) : ''}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-800/60">
              {filtered.length === 0 ? (
                // Empty state when no users match the search
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-gray-500">
                    <p>No users found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-800/30 transition group ${selected.has(user.id) ? 'bg-red-950/10' : ''}`}>
                    {/* Row checkbox */}
                    <td className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelect(user.id)} aria-label={`Select ${user.username}`} className="accent-red-500 cursor-pointer" />
                    </td>
                    {/* ID — shown as a subtle badge */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-md">
                        #{user.id}
                      </span>
                    </td>

                    {/* Username + avatar initial */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar placeholder using first letter of username */}
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-gray-700">
                          {user.username[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{user.username}</span>
                        {user.isPremium && (
                          <span className="text-[10px] font-bold text-black bg-yellow-400 px-1.5 py-0.5 rounded-full leading-none">
                            PRO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-gray-400 text-xs">{user.email}</td>

                    {/* Role dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={user.role}
                          disabled={loading === user.id}
                          onChange={(e) => changeRole(user.id, e.target.value)}
                          className={`text-xs font-semibold pl-2 pr-6 py-1 rounded-full border bg-transparent cursor-pointer focus:outline-none appearance-none ${roleBadge[user.role]} disabled:opacity-50`}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r} className="bg-gray-900 text-white">{r}</option>
                          ))}
                        </select>
                        {/* Custom dropdown arrow */}
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-60">▾</span>
                      </div>
                    </td>

                    {/* Story + comment counts */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-300 font-semibold">{user._count.stories}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-300 font-semibold">{user._count.comments}</span>
                    </td>

                    {/* Join date */}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {loading === user.id ? (
                        // Spinner shown while saving
                        <span className="text-xs text-gray-500 animate-pulse">Saving…</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {/* Verify / unverify toggle — grants the blue checkmark badge */}
                          <button
                            onClick={() => toggleVerify(user.id)}
                            title={user.isVerified ? 'Remove verification' : 'Grant verified badge'}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                              user.isVerified
                                ? 'border-blue-600/60 text-blue-400 hover:bg-blue-600/10'
                                : 'border-gray-700 text-gray-500 hover:border-blue-600/40 hover:text-blue-400'
                            }`}
                          >
                            {user.isVerified ? '✓ Verified' : 'Verify'}
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.username)}
                            className="text-xs px-3 py-1 rounded-lg border border-red-800/40 text-red-500 hover:bg-red-600/10 hover:border-red-600/60 hover:text-red-400 transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
