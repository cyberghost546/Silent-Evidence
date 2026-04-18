'use client';
// ============================================================
// FILE: CreateGroupModal.tsx
// PURPOSE: Modal dialog for creating a new horror community group.
//          Rendered as a full-screen overlay with a centred card.
//          When submitted, POSTs to /api/groups and calls onCreated()
//          with the new group object so the parent can add it to its list.
//
// KEY CONCEPT — lifting state up via callbacks:
//   This component doesn't manage the list of groups — its parent does.
//   Instead, two callbacks are passed as props:
//     onClose()     — called when the user clicks Cancel or × (hides the modal)
//     onCreated(g)  — called after a successful POST (passes the new group up)
//   This keeps the modal self-contained and reusable.
//
// KEY CONCEPT — modal backdrop click-to-close:
//   The outer <div> covers the full screen (fixed inset-0). Clicking it
//   calls onClose(). The inner card uses e.stopPropagation() — NOT here, the
//   card click simply doesn't bubble because it's a separate element.
//   The × button in the header also calls onClose().
//
// KEY CONCEPT — private toggle switch:
//   The isPrivate boolean is toggled by a styled <button> that flips a white
//   dot left/right inside a coloured pill — same pattern as AccountSettings.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Keep onClose/onCreated as the props interface for any "create item" modal.
//   - Change SUBGENRES and the form fields to match your domain.
//   - The fixed-inset-0 backdrop + centred card pattern works for any modal.
// ============================================================

import { useState } from 'react';

// Horror genre options for group creation
const SUBGENRES = ['Paranormal', 'Supernatural', 'Psychological Horror', 'Slasher', 'Gothic Horror', 'Cosmic Horror', 'Dark Fantasy', 'Other'];

type Group = {
  id: number; name: string; slug: string; description: string | null;
  coverImage: string | null; subgenre: string | null; isPrivate: boolean;
  createdAt: string; _count: { members: number; posts: number };
  members: { id: number; role: string }[];
};

export default function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (g: Group) => void;
}) {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [subgenre,    setSubgenre]    = useState('');
  const [coverImage,  setCoverImage]  = useState('');
  const [isPrivate,   setIsPrivate]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const submit = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, subgenre, coverImage, isPrivate }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Failed to create group.'); return; }
    onCreated(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Create Group</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Group Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Paranormal Investigators"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Subgenre</label>
            <select value={subgenre} onChange={e => setSubgenre(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="">— Select —</option>
              {SUBGENRES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="What is this group about?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Cover Image URL (optional)</label>
            <input value={coverImage} onChange={e => setCoverImage(e.target.value)} type="url"
              placeholder="https://..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>

          {/* Private toggle */}
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-10 h-5 rounded-full transition ${isPrivate ? 'bg-red-600' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isPrivate ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-gray-300">{isPrivate ? 'Private group' : 'Public group'}</span>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {saving ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
