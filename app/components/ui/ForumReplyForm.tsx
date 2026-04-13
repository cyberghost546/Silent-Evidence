'use client';
// app/components/ui/ForumReplyForm.tsx
// Simple form that lets a logged-in user post a reply to a forum thread.
// After a successful submission the textarea is cleared and the page is
// refreshed (via router.refresh()) so the new reply appears in the list.

import { useState } from 'react';               // useState — manages textarea value, loading flag, and error message
import { useRouter } from 'next/navigation';     // useRouter — used to call router.refresh() after a reply is posted

// Props passed in by the parent forum post page
export default function ForumReplyForm({ postId, forumSlug }: { postId: number; forumSlug: string }) {
  // content — the current text inside the reply textarea (controlled input)
  const [content, setContent] = useState('');

  // loading — true while the POST request is in-flight; disables the submit button to prevent double-submit
  const [loading, setLoading] = useState(false);

  // error — holds any error message returned by the API so it can be shown to the user
  const [error, setError]     = useState('');

  // router — Next.js app-router instance; we call router.refresh() to re-fetch server data after posting
  const router = useRouter();

  // submit — handles the form submit event
  // Prevents the default HTML form navigation, POSTs the reply to the API,
  // and either shows an error or clears the form and refreshes the page.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();               // stop the browser from reloading the page
    setLoading(true); setError('');   // show loading state, clear any previous error

    // POST the reply content to the replies endpoint for this forum post
    const res = await fetch(`/api/forum-posts/${postId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }), // send the reply text as JSON
    });

    // Parse the response body regardless of success/failure
    const data = await res.json();

    setLoading(false); // clear loading state now that we have a response

    if (!res.ok) {
      // API returned an error — show the message and keep the textarea content so the user doesn't lose their text
      setError(data.error ?? 'Something went wrong');
      return;
    }

    // Success — clear the textarea and refresh the server-rendered reply list
    setContent('');
    router.refresh(); // tells Next.js to re-run the Server Component that fetches replies
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    // The form element calls submit on submission
    <form onSubmit={submit} className="bg-gray-800 border border-gray-700 rounded-xl p-5">

      {/* Form heading */}
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Leave a Reply</h3>

      {/* Inline error message — only shown when the API returned an error */}
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {/* Reply textarea — controlled input, required so the browser validates before submit */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)} // update state on every keystroke
        placeholder="Write your reply..."
        required
        rows={4}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition resize-none mb-3"
      />

      {/* Submit button — disabled while loading OR when the textarea is empty */}
      <button
        type="submit"
        disabled={loading || !content.trim()} // content.trim() prevents submitting whitespace-only replies
        className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
      >
        {loading ? 'Posting…' : 'Post Reply'} {/* swap label while in-flight */}
      </button>
    </form>
  );
}
