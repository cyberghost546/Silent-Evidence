'use client';
// ============================================================
// FILE: AdminCommentsClient.tsx
// PURPOSE: Admin panel for reviewing and moderating all comments site-wide.
//          Admins can switch between "All" and "Flagged" views, flag/unflag
//          individual comments, and permanently delete them.
//
// KEY CONCEPT — Optimistic Updates:
//   Instead of waiting for the server to respond before updating the UI,
//   we update React state immediately when the admin clicks a button.
//   This makes the UI feel instant. If the server call fails, you would
//   roll back the state change (not implemented here since admin actions
//   rarely fail, but that's the full pattern).
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Pass the initial comments array from a server component as a prop.
//   - The filter pattern (derived `visible` array from a `filter` state value)
//     works for any list where you want tab-style filtering without a network call.
//   - The optimistic delete pattern (filter out the deleted ID immediately)
//     can be used on any list where items can be removed.
// ============================================================

import { useState } from 'react';

// Shape of a comment as returned by GET /api/admin/comments
type Comment = {
  id: number;
  content: string;
  flagged: boolean; // true = flagged for admin review; shown with a red border
  createdAt: string; // ISO date string
  user: { username: string };
  story: { title: string; slug: string };
};

export default function AdminCommentsClient({ comments: initial }: { comments: Comment[] }) {
  // comments — the live working copy of the list.
  // We start from `initial` (from the server) and mutate locally on each action.
  const [comments, setComments] = useState(initial);

  // filter controls which comments are visible.
  // 'all' = show everything; 'flagged' = only flagged comments.
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');

  // Flips the flagged state of a comment via PATCH, then updates local state
  const toggleFlag = async (id: number, flagged: boolean) => {
    await fetch(`/api/admin/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged: !flagged }),
    });
    // Update the comment in the local array without a full page reload
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, flagged: !flagged } : c)));
  };

  // Deletes a comment after confirmation, then removes it from local state
  const deleteComment = async (id: number) => {
    if (!confirm('Delete this comment?')) return;
    await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  // Derived list — apply the active filter to decide which comments to render
  const visible = filter === 'flagged' ? comments.filter((c) => c.flagged) : comments;

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(['all', 'flagged'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-red-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'}`}
          >
            {f === 'all'
              ? `All (${comments.length})`
              : `Flagged (${comments.filter((c) => c.flagged).length})`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No comments to show.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((c) => (
            <div
              key={c.id}
              className={`bg-gray-800 border rounded-xl p-4 ${c.flagged ? 'border-red-600/50' : 'border-gray-700'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-sm font-semibold text-white">{c.user.username}</span>
                    {c.flagged && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                        Flagged
                      </span>
                    )}
                    <a
                      href={`/story/${c.story.slug}`}
                      className="text-xs text-red-400 hover:text-red-300 transition truncate max-w-xs"
                    >
                      {c.story.title}
                    </a>
                    <span className="text-xs text-gray-600 ml-auto">
                      {new Date(c.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-3">{c.content}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleFlag(c.id, c.flagged)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition ${c.flagged ? 'border-gray-600 text-gray-400 hover:text-white' : 'border-yellow-600/40 text-yellow-400 hover:bg-yellow-600/10'}`}
                  >
                    {c.flagged ? 'Unflag' : 'Flag'}
                  </button>
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-600/40 text-red-400 hover:bg-red-600/10 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
