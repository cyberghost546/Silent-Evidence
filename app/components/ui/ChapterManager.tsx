'use client';
// ============================================================
// FILE: ChapterManager.tsx
// PURPOSE: Full chapter management UI shown on the story edit page.
//          Authors can: add chapters, edit their title/content in a rich
//          editor, reorder them with ↑/↓ buttons, and delete them.
//
// KEY CONCEPT — editing state machine:
//   The `editing` state acts as a mini state machine:
//     null    → list view (show all chapters)
//     'new'   → creating a new chapter (blank editor)
//     number  → editing an existing chapter (editor pre-filled from API)
//   This single variable drives which view is rendered, keeping the logic
//   clean and easy to follow.
//
// KEY CONCEPT — dynamic import (next/dynamic + ssr: false):
//   RichEditor uses browser-only APIs (the DOM, contentEditable, etc.) that
//   crash during server-side rendering. Wrapping it with dynamic() and
//   ssr: false tells Next.js to skip rendering it on the server and only
//   load it in the browser. Always do this for rich text editors, map
//   libraries, or anything that touches window/document directly.
//
// KEY CONCEPT — optimistic reorder:
//   When the user clicks ↑ or ↓, we swap the two chapters in local state
//   immediately (fast UI feedback), then fire two PATCH requests in parallel
//   with Promise.all to persist both new order values.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Pass storyId (number) so the component knows which story to manage.
//   - Replace /api/chapters with your own chapter API routes.
//   - The null/'new'/number editing state machine pattern can be reused for
//     any list where items can be viewed, created, and edited in place.
// ============================================================

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Load the rich editor only on the client — avoids SSR issues
const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

type Chapter = {
  id: number;
  title: string;
  order: number;
  views: number; // per-chapter read count, incremented on the chapter reading page
  createdAt: string;
};

type Props = { storyId: number };

export default function ChapterManager({ storyId }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state — null = list view, 'new' = creating, number = editing that chapter id
  const [editing, setEditing] = useState<'new' | number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load chapters on mount
  useEffect(() => {
    fetch(`/api/chapters?storyId=${storyId}`)
      .then((r) => r.json())
      .then((data) => setChapters(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId]);

  // Open the editor for a new chapter
  const startNew = () => {
    setEditing('new');
    setTitle('');
    setContent('');
    setError('');
  };

  // Open the editor for an existing chapter (loads full content from API)
  const startEdit = async (id: number) => {
    setSaving(true);
    const res = await fetch(`/api/chapters/${id}`);
    const data = await res.json();
    setSaving(false);
    setTitle(data.title ?? '');
    setContent(data.content ?? '');
    setEditing(id);
    setError('');
  };

  const cancel = () => {
    setEditing(null);
    setError('');
  };

  // Save new or updated chapter
  const save = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');

    if (editing === 'new') {
      // Create
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, title: title.trim(), content }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(data.error ?? 'Failed to save.');
        return;
      }
      // Add to list and sort
      setChapters((prev) =>
        [
          ...prev,
          {
            id: data.id,
            title: data.title,
            order: data.order,
            views: data.views ?? 0,
            createdAt: data.createdAt,
          },
        ].sort((a, b) => a.order - b.order)
      );
    } else {
      // Update
      const res = await fetch(`/api/chapters/${editing}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(data.error ?? 'Failed to save.');
        return;
      }
      setChapters((prev) => prev.map((c) => (c.id === editing ? { ...c, title: data.title } : c)));
    }

    setEditing(null);
  };

  // Delete a chapter with confirmation
  const remove = async (id: number) => {
    if (!confirm('Delete this chapter? This cannot be undone.')) return;
    const res = await fetch(`/api/chapters/${id}`, { method: 'DELETE' });
    if (res.ok) setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  // Move chapter up or down — swaps order values with the neighbour
  const move = async (id: number, direction: 'up' | 'down') => {
    const idx = chapters.findIndex((c) => c.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= chapters.length) return;

    const a = chapters[idx];
    const b = chapters[swapIdx];

    // Optimistically swap in UI
    const updated = chapters
      .map((c) => {
        if (c.id === a.id) return { ...c, order: b.order };
        if (c.id === b.id) return { ...c, order: a.order };
        return c;
      })
      .sort((x, y) => x.order - y.order);
    setChapters(updated);

    // Persist both order changes
    await Promise.all([
      fetch(`/api/chapters/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: b.order }),
      }),
      fetch(`/api/chapters/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: a.order }),
      }),
    ]);
  };

  // ── Editor view ──────────────────────────────────────────────────────────
  if (editing !== null) {
    return (
      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">
          {editing === 'new' ? '+ New Chapter' : 'Edit Chapter'}
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chapter title"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white mb-4 focus:outline-none focus:ring-2 focus:ring-red-600"
        />

        {/* Rich text editor for chapter content */}
        <div className="mb-4">
          <RichEditor
            value={content}
            onChange={(html) => setContent(html)}
            placeholder="Write your chapter here…"
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={cancel}
            className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {saving ? 'Saving…' : 'Save Chapter'}
          </button>
        </div>
      </div>
    );
  }

  // ── Chapter list view ────────────────────────────────────────────────────
  return (
    <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white">Chapters</h2>
          {chapters.length > 0 && (
            <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
              {chapters.length}
            </span>
          )}
        </div>
        <button
          onClick={startNew}
          className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
        >
          + Add Chapter
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-600">Loading…</p>
      ) : chapters.length === 0 ? (
        <div className="text-center py-6 text-gray-600">
          <p className="text-sm">No chapters yet.</p>
          <p className="text-xs mt-1">Add a chapter to split this story into parts.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chapters.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3"
            >
              {/* Order number */}
              <span className="text-sm font-bold text-gray-600 w-5 flex-shrink-0">{i + 1}</span>

              {/* Title */}
              <span className="flex-1 text-sm text-white truncate">{c.title}</span>

              {/* Per-chapter view count — shows how many times this chapter has been read */}
              <span className="text-xs text-gray-600 flex items-center gap-1 flex-shrink-0">
                {c.views.toLocaleString()}
              </span>

              {/* Up/Down reorder buttons */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => move(c.id, 'up')}
                  disabled={i === 0}
                  className="p-1 text-gray-600 hover:text-white disabled:opacity-20 transition"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(c.id, 'down')}
                  disabled={i === chapters.length - 1}
                  className="p-1 text-gray-600 hover:text-white disabled:opacity-20 transition"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>

              {/* Edit / Delete */}
              <button
                onClick={() => startEdit(c.id)}
                disabled={saving}
                className="text-xs text-blue-400 hover:text-blue-300 transition disabled:opacity-50"
              >
                Edit
              </button>
              <button
                onClick={() => remove(c.id)}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4">
        Chapters appear in order on the story page. Readers navigate between them with prev/next
        buttons.
      </p>
    </div>
  );
}
