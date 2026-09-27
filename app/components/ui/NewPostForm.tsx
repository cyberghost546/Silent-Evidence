'use client';
// NewPostForm.tsx
// Inline form for creating a new forum post within a specific forum thread.
// Rendered as a "+ New Post" button that expands into a full form when clicked,
// keeping the forum page tidy until the user actually wants to write.
//
// Props:
//   forumSlug — URL slug of the forum this post belongs to.
//               Used to build the API route and the redirect URL after posting.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPostForm({ forumSlug }: { forumSlug: string }) {
  // Whether the compose form is expanded (true) or collapsed to a button (false)
  const [open, setOpen] = useState(false);

  // Controlled input values for the post title and body
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // True while the POST request is in-flight — disables the submit button
  const [loading, setLoading] = useState(false);

  // Error message shown above the form on API failure
  const [error, setError] = useState('');

  const router = useRouter();

  // Submits the new post to POST /api/forums/[forumSlug]/posts
  // On success, clears the form and navigates to the new post's page
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch(`/api/forums/${forumSlug}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      return;
    }
    // Clear fields and collapse back to button before navigating
    setTitle('');
    setContent('');
    setOpen(false);
    router.push(`/forums/${forumSlug}/${data.id}`);
  };

  // Collapsed state — just show the trigger button
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
      >
        + New Post
      </button>
    );

  // Expanded state — full compose form
  return (
    <form onSubmit={submit} className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-2">
      <h3 className="font-semibold text-white mb-4">Create New Post</h3>

      {/* API error message */}
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {/* Post title input */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title..."
        required
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition mb-3"
      />

      {/* Post body textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        required
        rows={4}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition resize-none mb-3"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Submit — disabled while posting */}
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {loading ? 'Posting…' : 'Post'}
        </button>
        {/* Cancel — collapses back to the trigger button without posting */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
