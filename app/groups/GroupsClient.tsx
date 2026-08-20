'use client';
/**
 * app/groups/GroupsClient.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the Groups listing page — it shows a grid of all horror community
 * groups. Users can filter by subgenre using tab buttons at the top, and
 * logged-in users can create a new group via a modal.
 *
 * STATE OVERVIEW:
 *   groups      — the full list of groups, initialised from server-fetched data
 *   filter      — the currently selected subgenre filter tab ('All' by default)
 *   showCreate  — whether the CreateGroupModal is open
 *
 * FILTERING PATTERN:
 * All filtering happens in the browser — no new network request is made when
 * you switch tabs. We derive `filtered` from `groups` using .filter() every
 * render. This is efficient for small-to-medium lists (a few hundred items).
 * For very large lists you would instead fetch from the server with a query param.
 *
 * OPTIMISTIC UPDATE:
 * When a group is created, handleCreated() prepends it to the local state so
 * it appears instantly — no page reload needed.
 *
 * HOW TO REUSE:
 * This tab-filter + grid pattern works for any category-filtered list.
 * 1. Replace SUBGENRES with your own filter values.
 * 2. Replace the Group type with your item shape.
 * 3. Replace the card markup inside filtered.map() with your card design.
 * 4. Swap CreateGroupModal for your own creation modal.
 */
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CreateGroupModal from '@/app/components/ui/CreateGroupModal';

type Group = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  subgenre: string | null;
  isPrivate: boolean;
  createdAt: string;
  _count: { members: number; posts: number };
  members: { id: number; role: string }[];
};

// Horror genre filter tabs for group browsing
const SUBGENRES = ['All', 'Paranormal', 'Supernatural', 'Psychological Horror', 'Slasher', 'Gothic Horror', 'Cosmic Horror', 'Dark Fantasy', 'Other'];

export default function GroupsClient({ groups: initial, userId }: { groups: Group[]; userId: number | null }) {
  // groups — full list, starts from server-fetched data passed as props
  const [groups, setGroups]           = useState(initial);
  // filter — which subgenre tab is active; 'All' shows everything
  const [filter, setFilter]           = useState('All');
  // showCreate — controls whether the create-group modal is open
  const [showCreate, setShowCreate]   = useState(false);

  // Derived list — no state needed; recomputed on every render from `groups` + `filter`
  // filter === 'All' skips filtering entirely; otherwise match by subgenre string
  const filtered = filter === 'All' ? groups : groups.filter(g => g.subgenre === filter);

  // Called by CreateGroupModal after a successful POST — prepend to keep it at the top
  const handleCreated = (g: Group) => setGroups(prev => [g, ...prev]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <p className="text-sm text-gray-500 mt-1">Horror communities for every genre.</p>
        </div>
        {userId && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
          >
            + Create Group
          </button>
        )}
      </div>

      {/* Subgenre filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SUBGENRES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-xs rounded-full border transition ${
              filter === s
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p>No groups yet{filter !== 'All' ? ` in ${filter}` : ''}.{userId ? ' Create the first one!' : ''}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(group => {
            const isMember = group.members.length > 0;
            return (
              <Link
                key={group.id}
                href={`/groups/${group.slug}`}
                className="group bg-gray-900 border border-gray-800 hover:border-red-600/50 rounded-xl overflow-hidden transition-all"
              >
                {/* Cover image or gradient placeholder */}
                {group.coverImage ? (
                  <div className="relative h-28 overflow-hidden">
                    <Image src={group.coverImage} alt={group.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-28 bg-gradient-to-br from-red-950/40 to-gray-800 flex items-center justify-center">
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-white group-hover:text-red-400 transition line-clamp-1">{group.name}</h3>
                    {isMember && <span className="flex-shrink-0 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5">Joined</span>}
                  </div>
                  {group.subgenre && <span className="text-xs text-red-400 font-semibold">{group.subgenre}</span>}
                  {group.description && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{group.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-600">
                    <span>{group._count.members} {group._count.members === 1 ? 'member' : 'members'}</span>
                    <span>·</span>
                    <span>{group._count.posts} posts</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
