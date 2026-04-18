'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  _count: { stories: number };
};

// Emoji map — keyed by slug so each category gets a matching icon
const CATEGORY_ICONS: Record<string, string> = {
  'ghost-stories':     '👻',
  'psychological':     '🧠',
  'supernatural':      '🌀',
  'paranormal':        '🔮',
  'slasher-horror':    '🔪',
  'cosmic-horror':     '🌌',
  'body-horror':       '🧬',
  'urban-legends':     '🌆',
  'true-crime':        '🔍',
  'tech-horror':       '💻',
  'survival-horror':   '🪓',
  'occult-witchcraft': '🕯️',
  'monsters-creatures':'🐉',
  'dark-fantasy':      '⚔️',
  'folk-horror':       '🌾',
  'found-footage':     '📹',
  'dark-romance':      '🥀',
  'post-apocalyptic':  '☢️',
  'haunted-places':    '🏚️',
  'sci-fi-horror':     '🚀',
};

export default function AdminCategoriesClient({ categories }: { categories: Category[] }) {
  // router.refresh() re-fetches server data without a full navigation
  const router = useRouter();

  // loading stores the ID of the category currently being deleted (shows disabled state)
  // null means no deletion is in progress
  const [loading, setLoading] = useState<number | null>(null);

  // showForm toggles the "Add Category" form panel on/off
  const [showForm, setShowForm] = useState(false);

  // adding is true while the POST /api/admin/categories request is in flight
  const [adding, setAdding] = useState(false);

  // form holds the three controlled input values for the new category
  const [form, setForm] = useState({ name: '', slug: '', description: '' });

  // Auto-generate a URL slug whenever the user types in the Name field.
  // Steps: lowercase → trim → remove non-alphanumeric → replace spaces with dashes
  // Example: "My New Category!" → "my-new-category"
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    setForm({ ...form, name, slug });
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setAdding(false);
    setForm({ name: '', slug: '', description: '' });
    setShowForm(false);
    router.refresh();
  };

  const deleteCategory = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"? Stories in this category will be unlinked.`)) return;
    setLoading(id);
    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Add Category'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addCategory} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white">New Category</h2>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
            <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Slug *</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition resize-none" />
          </div>
          <button type="submit" disabled={adding}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
            {adding ? 'Adding...' : 'Add Category'}
          </button>
        </form>
      )}

      {/* Category grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const icon = CATEGORY_ICONS[cat.slug] ?? '🏷️';
          return (
            <div
              key={cat.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3
                         hover:border-gray-600 transition group"
            >
              {/* Icon + name + delete */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{cat.name}</p>
                    <p className="text-xs text-gray-600 truncate font-mono">/category/{cat.slug}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id, cat.name)}
                  disabled={loading === cat.id}
                  className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-40
                             transition shrink-0 opacity-0 group-hover:opacity-100"
                >
                  {loading === cat.id ? '…' : 'Delete'}
                </button>
              </div>

              {/* Description */}
              {cat.description && (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              )}

              {/* Story count badge */}
              <div className="mt-auto">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                                 bg-gray-800 border border-gray-700 text-gray-400">
                  📖 {cat._count.stories} {cat._count.stories === 1 ? 'story' : 'stories'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
