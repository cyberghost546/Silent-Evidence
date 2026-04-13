'use client';
// ============================================================
// FILE: AddToListButton.tsx
// PURPOSE: Lets a logged-in user save the current story to one of their
//          reading lists. Clicking the button opens a dropdown that shows
//          all their existing lists and an inline "create new list" form.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Pass storyId (the story's database ID) and isLoggedIn (boolean).
//   - The component returns null for guests so it's always safe to render.
//   - The "click outside to close" pattern uses a ref + mousedown listener —
//     you can copy this exact pattern for any dropdown or popover.
//   - The Set<number> for `added` is a great way to track which items have
//     already been acted on within a session without a full page refresh.
// ============================================================

import { useState, useEffect, useRef } from 'react';

// Shape of a reading list returned by GET /api/lists
type StoryList = { id: number; name: string; _count: { items: number } };

export default function AddToListButton({ storyId, isLoggedIn }: { storyId: number; isLoggedIn: boolean }) {
  // open — whether the dropdown panel is visible
  const [open, setOpen]       = useState(false);
  // lists — the user's reading lists fetched from the API
  const [lists, setLists]     = useState<StoryList[]>([]);
  // added — tracks which list IDs this story has already been added to this session
  const [added, setAdded]     = useState<Set<number>>(new Set());
  // loading — disables buttons while an API call is in progress
  const [loading, setLoading] = useState(false);
  // creating — toggles the "new list" input form inside the dropdown
  const [creating, setCreating] = useState(false);
  // newName — the value typed in the new-list input
  const [newName, setNewName] = useState('');
  // ref wraps the whole component to detect outside clicks
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown when the user clicks outside the component
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetches the user's reading lists from the API and stores them in state
  const fetchLists = async () => {
    const res = await fetch('/api/lists');
    if (res.ok) setLists(await res.json());
  };

  // Opens/closes the dropdown and re-fetches lists each time it opens
  const handleOpen = () => {
    if (!isLoggedIn) return;
    setOpen(o => !o);
    fetchLists();
  };

  // POSTs this story to an existing list, then marks that list as added
  const addToList = async (listId: number) => {
    setLoading(true);
    const res = await fetch(`/api/lists/${listId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId }),
    });
    if (res.ok) setAdded(prev => new Set(prev).add(listId));
    setLoading(false);
  };

  // Creates a new reading list, then immediately adds this story to it
  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const list = await res.json();
      await addToList(list.id);
      // Prepend the new list to the local list so it appears immediately
      setLists(prev => [{ ...list, _count: { items: 1 } }, ...prev]);
      setNewName('');
      setCreating(false);
    }
    setLoading(false);
  };

  // Don't render anything for guests — only logged-in users can use lists
  if (!isLoggedIn) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        title="Add to list"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 text-xs font-medium rounded-lg transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
        </svg>
        Add to List
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-semibold text-white">Add to list</p>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {lists.length === 0 && !creating && (
              <p className="text-xs text-gray-500 px-4 py-3">No lists yet. Create one below.</p>
            )}
            {lists.map(list => (
              <button key={list.id} onClick={() => addToList(list.id)} disabled={loading || added.has(list.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800 transition text-left disabled:opacity-50">
                <span className="text-sm text-gray-300 truncate">{list.name}</span>
                <span className={`text-xs ml-2 flex-shrink-0 ${added.has(list.id) ? 'text-green-400' : 'text-gray-600'}`}>
                  {added.has(list.id) ? '✓ Added' : `${list._count.items} stories`}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-700 p-3">
            {creating ? (
              <div className="flex gap-2">
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createAndAdd()}
                  placeholder="List name..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600" />
                <button onClick={createAndAdd} disabled={loading || !newName.trim()}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition">
                  Create
                </button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create new list
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
