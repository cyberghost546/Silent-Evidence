'use client';
/**
 * AdminBundlesClient.tsx
 * ----------------------
 * PURPOSE:
 *   Full CRUD admin interface for "story bundles" — curated collections of stories
 *   sold together as a single purchase (like a box set).
 *
 * HOW IT WORKS:
 *   1. The parent server page fetches all existing bundles and all published stories
 *      from the database and passes them as props.
 *   2. The admin can click "+ New Bundle" to open an inline form, fill in the title,
 *      description, cover image URL, price (in dollars), and select stories using
 *      checkboxes.
 *   3. Saving POSTs to /api/admin/bundles (create) or PATCHes to
 *      /api/admin/bundles/[id] (edit).  The server returns the saved bundle object
 *      which is merged back into local state so the list updates without a reload.
 *   4. "Hide/Show" toggles the `active` field via PATCH — inactive bundles are
 *      hidden from the public storefront.
 *   5. "Delete" sends DELETE to the API then removes the row from local state.
 *
 * PRICE CONVENTION:
 *   Prices are stored in the database as integer cents (e.g. $9.99 → 999).
 *   The form displays dollars (divide by 100) and converts back to cents on save.
 *   This avoids floating-point rounding errors.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - Swap the API paths for your own backend.
 *   - The "blank form / openCreate / openEdit" pattern works well for any admin
 *     resource that needs both create and edit in the same form.
 *   - The cents↔dollars conversion is a useful snippet for any e-commerce feature.
 */

import { useState } from 'react';
import Image from 'next/image';

// ── Type definitions ──────────────────────────────────────────────────────────

// A single story entry (minimal fields needed for the checkbox picker)
type StoryItem = { id: number; title: string; slug: string };

// A row in the bundle_items join table, with the nested story data
type BundleItem = { id: number; story: StoryItem };

// A full bundle record as returned by the API / Prisma
type Bundle = {
  id: number;
  title: string;
  slug: string;
  description: string | null;   // optional marketing blurb
  coverImage: string | null;    // optional URL for a cover thumbnail
  price: number;                // stored in cents (e.g. 999 = $9.99)
  active: boolean;              // false = hidden from the public storefront
  items: BundleItem[];          // the stories included in this bundle
  _count?: { purchases: number }; // how many times this bundle has been bought
};

// Props received from the parent server page
type Props = {
  initialBundles: Bundle[];   // pre-fetched list of all bundles
  allStories: StoryItem[];    // all published stories — shown in the checkbox picker
};

export default function AdminBundlesClient({ initialBundles, allStories }: Props) {
  // Local copy of the bundle list — updated optimistically after API calls
  // so the UI reflects changes without waiting for a full page reload.
  const [bundles, setBundles]   = useState(initialBundles);

  // When `editing` is non-null, the form is in "edit" mode for that bundle.
  // When null and `creating` is true, the form is in "create new" mode.
  const [editing, setEditing]   = useState<Bundle | null>(null);

  // Controls whether the create/edit form is visible at all
  const [creating, setCreating] = useState(false);

  // True while the save API call is in flight — disables the Save button
  const [saving, setSaving]     = useState(false);

  // Error message shown inside the form if the API returns an error
  const [error, setError]       = useState('');

  // ── Form state ────────────────────────────────────────────────────────────

  // `blank` is the default empty state for a new bundle form.
  // We define it as a const so we can reset to it after saving or cancelling.
  const blank = { title: '', description: '', coverImage: '', price: '', storyIds: [] as number[] };

  // The controlled form values — updated as the admin types
  const [form, setForm] = useState(blank);

  // ── Open create form ───────────────────────────────────────────────────────

  // Clears editing state and resets the form to blank, then shows the form
  const openCreate = () => {
    setEditing(null);   // make sure we're not in "edit" mode
    setForm(blank);     // start with empty fields
    setCreating(true);  // show the form panel
    setError('');
  };

  // ── Open edit form ─────────────────────────────────────────────────────────

  // Pre-fills the form with the bundle's existing values so the admin can
  // change only the fields they want and save.
  const openEdit = (b: Bundle) => {
    setEditing(b);   // remember which bundle we're editing (used by save())
    setForm({
      title:       b.title,
      description: b.description ?? '',
      coverImage:  b.coverImage  ?? '',
      // Divide by 100 to show dollars in the input (the DB stores cents)
      price:       String(b.price / 100),
      // Extract just the story IDs from the nested items array
      storyIds:    b.items.map(i => i.story.id),
    });
    setCreating(true); // re-use the same form panel for editing
    setError('');
  };

  // ── Toggle a story in the checkbox picker ─────────────────────────────────

  // Called each time the admin checks/unchecks a story checkbox.
  // If the story ID is already in the list, remove it; otherwise add it.
  const toggleStory = (id: number) =>
    setForm(f => ({
      ...f,
      storyIds: f.storyIds.includes(id)
        ? f.storyIds.filter(s => s !== id)   // remove
        : [...f.storyIds, id],               // add
    }));

  // ── Save (create or update) ────────────────────────────────────────────────

  // Sends the form data to the API.
  // Uses POST for new bundles and PATCH for edits.
  const save = async () => {
    setSaving(true);
    setError('');

    // Build the payload — convert price from user-entered dollars back to cents
    const payload = {
      title:       form.title.trim(),
      description: form.description.trim() || null,
      coverImage:  form.coverImage.trim()  || null,
      // parseFloat handles decimal input; multiply by 100 and round to get whole cents
      price:       Math.round(parseFloat(form.price || '0') * 100),
      storyIds:    form.storyIds,
    };

    // Choose the correct URL and HTTP method based on whether we're editing
    const url    = editing ? `/api/admin/bundles/${editing.id}` : '/api/admin/bundles';
    const method = editing ? 'PATCH' : 'POST';

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);

    // Show the API error message inside the form if something went wrong
    if (!res.ok) { setError(data.error ?? 'Failed to save.'); return; }

    // Merge the saved bundle into the local list so the table updates immediately
    if (editing) {
      // Replace the old version of this bundle with the updated one from the API
      setBundles(prev => prev.map(b => b.id === editing.id ? data : b));
    } else {
      // Prepend the newly created bundle to the top of the list
      setBundles(prev => [data, ...prev]);
    }
    setCreating(false); // close the form on success
  };

  // ── Delete a bundle ────────────────────────────────────────────────────────

  // Sends DELETE to the API then removes the row from local state.
  const remove = async (id: number) => {
    if (!confirm('Delete this bundle?')) return;
    const res = await fetch(`/api/admin/bundles/${id}`, { method: 'DELETE' });
    // Only remove from the local list if the server confirmed the deletion
    if (res.ok) setBundles(prev => prev.filter(b => b.id !== id));
  };

  // ── Toggle active (show/hide) ──────────────────────────────────────────────

  // Flips the `active` flag on a bundle.
  // Active = visible on the storefront.  Inactive = hidden.
  const toggle = async (b: Bundle) => {
    const res  = await fetch(`/api/admin/bundles/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // Send the OPPOSITE of the current active value to flip it
      body: JSON.stringify({ active: !b.active }),
    });
    if (res.ok) {
      const data = await res.json();
      // Update only this bundle in the list, leaving all others unchanged
      setBundles(prev => prev.map(x => x.id === b.id ? data : x));
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Story Bundles</h1>
          <p className="text-gray-500 text-sm mt-1">Curated collections sold as a single purchase.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition">
          + New Bundle
        </button>
      </div>

      {/* Create / Edit form */}
      {creating && (
        <div className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">{editing ? 'Edit Bundle' : 'New Bundle'}</h2>

          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Bundle title"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
          />

          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-600"
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              value={form.coverImage}
              onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
              placeholder="Cover image URL (optional)"
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
                type="number" min="0" step="0.01"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          {/* Story picker */}
          <div>
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Select stories ({form.storyIds.length} selected)</p>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {allStories.map(s => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={form.storyIds.includes(s.id)}
                    onChange={() => toggleStory(s.id)}
                    className="accent-red-600"
                  />
                  <span className="text-sm text-gray-300 truncate">{s.title}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-xl transition">
              Cancel
            </button>
            <button onClick={save} disabled={saving || !form.title} className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create bundle'}
            </button>
          </div>
        </div>
      )}

      {/* Bundle list */}
      {bundles.length === 0 ? (
        <p className="text-gray-600 text-sm py-10 text-center">No bundles yet.</p>
      ) : (
        <div className="space-y-3">
          {bundles.map(b => (
            <div key={b.id} className={`flex gap-4 items-start bg-gray-900 border rounded-xl p-4 ${b.active ? 'border-gray-800' : 'border-gray-800 opacity-60'}`}>
              {b.coverImage && <Image src={b.coverImage} alt={b.title} width={64} height={48} className="object-cover rounded-lg shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{b.title}</p>
                  {!b.active && <span className="text-xs bg-gray-800 border border-gray-700 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  ${(b.price / 100).toFixed(2)} · {b.items.length} stories
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggle(b)} className="text-xs text-gray-500 hover:text-white transition">
                  {b.active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => openEdit(b)} className="text-xs text-blue-400 hover:text-blue-300 transition">Edit</button>
                <button onClick={() => remove(b.id)} className="text-xs text-red-400 hover:text-red-300 transition">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
