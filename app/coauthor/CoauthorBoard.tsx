'use client';
/**
 * app/coauthor/CoauthorBoard.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the Co-Author Requests board — a community board where authors can
 * post that they are looking for a writing partner. Other authors can read the
 * listings and reach out privately.
 *
 * FEATURES:
 * • Shows all open/closed co-author requests as cards.
 * • Logged-in users see a "+ Post a Co-author Request" button.
 * • Clicking it reveals a form (title, description, genres) inline — no page reload.
 * • The author of a request can toggle it "Filled" or "Reopen" via a PATCH request.
 * • Genre tags are stored as a comma-separated string and split into individual pills.
 *
 * STATE OVERVIEW:
 *   requests    — the full list of co-author requests (starts from server-passed data)
 *   showForm    — whether the "Post Request" form is visible
 *   title       — form field: the headline for the request
 *   description — form field: longer explanation of the project
 *   genres      — form field: optional comma-separated genre list
 *   submitting  — true while the POST request is in flight (disables the button)
 *   error       — inline validation or API error message
 *
 * OPTIMISTIC-STYLE UPDATE — POST:
 * After a successful POST, the returned CoauthorRequest object is prepended:
 *   setRequests(prev => [created, ...prev])
 * This means the new post appears at the top of the list immediately, without
 * a page reload or a refetch of the entire list.
 *
 * OPTIMISTIC-STYLE UPDATE — PATCH (toggle):
 * handleToggle() sends PATCH to the API, then flips isOpen locally:
 *   prev.map(r => r.id === id ? { ...r, isOpen: !r.isOpen } : r)
 * The spread preserves all other fields; only isOpen changes.
 *
 * INLINE FORM PATTERN:
 * showForm toggles between the "+" button and the form. On cancel, we also
 * clear the error so stale messages don't reappear next time the form opens.
 *
 * GENRE PILL RENDERING:
 * genres is stored as "Cosmic, Action, Gothic" — a single comma-separated string.
 * We split it with .split(',') and .trim() each part, then render each as a
 * <span> pill. This avoids a separate genres[] array on the data model.
 *
 * HOW TO REUSE:
 * This pattern — a list page with an inline "create" form that prepends the new
 * item to the list without a page reload — is very reusable. Key ideas:
 *   1. Keep the list in useState initialised from server-fetched props.
 *   2. After a successful POST, prepend with: setItems(prev => [newItem, ...prev]).
 *   3. Keep a separate `showForm` boolean to toggle the form in/out of view.
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ── TypeScript Interfaces ──────────────────────────────────────────────────────

// Shape of a co-author request record as returned by the API/Prisma
interface CoauthorRequest {
  id:          number;
  title:       string;
  description: string;
  // genres may be null when the author left it blank
  genres:      string | null;
  // true = still accepting partners; false = slot filled
  isOpen:      boolean;
  // Prisma returns Date objects; JSON serialisation turns them to strings
  createdAt:   string | Date;
  authorId:    number;
  author: {
    username: string;
    // profile is null when the user hasn't set up their profile yet
    profile:  { avatar: string | null } | null;
  };
}

// Props passed from the server page
interface Props {
  initialRequests: CoauthorRequest[];
  // null when the visitor is not logged in
  currentUserId:   number | null;
}

export default function CoauthorBoard({ initialRequests, currentUserId }: Props) {
  // ── State ────────────────────────────────────────────────────────────────────

  // Full list of requests — initialised from server data, updated optimistically
  const [requests,    setRequests]    = useState<CoauthorRequest[]>(initialRequests);
  // Controls whether the inline "Post Request" form is visible
  const [showForm,    setShowForm]    = useState(false);
  // Controlled form fields
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [genres,      setGenres]      = useState('');
  // Prevents double-submits while the POST is in-flight
  const [submitting,  setSubmitting]  = useState(false);
  // Validation or API error shown inside the form
  const [error,       setError]       = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  // Post a new co-author request to the API
  const handlePost = async () => {
    setError(null);

    // Client-side validation before hitting the network
    if (title.trim().length < 5) { setError('Title must be at least 5 characters.'); return; }
    if (description.trim().length < 20) { setError('Description must be at least 20 characters.'); return; }

    setSubmitting(true);
    const res = await fetch('/api/coauthor-requests', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, description, genres }),
    });

    if (res.ok) {
      const created: CoauthorRequest = await res.json();
      // Prepend so the newest request appears at the top of the board immediately
      setRequests(prev => [created, ...prev]);
      // Close the form and reset all fields for next time
      setShowForm(false);
      setTitle(''); setDescription(''); setGenres('');
    } else {
      // Parse the API error message; fall back if the body isn't valid JSON
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to post. Please try again.');
    }
    setSubmitting(false);
  };

  // Toggle a request between "Open" and "Filled" — only the author sees this button
  const handleToggle = async (id: number) => {
    const res = await fetch(`/api/coauthor-requests/${id}`, { method: 'PATCH' });
    if (res.ok) {
      // Flip isOpen for the matching request; leave all other requests unchanged
      setRequests(prev => prev.map(r => r.id === id ? { ...r, isOpen: !r.isOpen } : r));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/*
        "Post a request" button — only shown to logged-in users who haven't
        already opened the form. currentUserId is null for guests.
      */}
      {currentUserId && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border border-dashed border-gray-700 hover:border-red-600 text-gray-500 hover:text-red-400 text-sm rounded-xl transition"
        >
          + Post a Co-author Request
        </button>
      )}

      {/* ── Inline create form ────────────────────────────────────────── */}
      {showForm && (
        <div className="border border-gray-800 rounded-xl p-5 bg-gray-900 space-y-3">
          <h3 className="text-sm font-bold text-white">New Co-author Request</h3>

          {/* Inline validation/API error — only visible when error is non-null */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/*
            suppressHydrationWarning on inputs: Next.js SSR can produce a
            mismatch if the server and client render different default values
            (e.g. autofill). This attribute silences that warning for form fields.
          */}
          <input
            suppressHydrationWarning
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder='Title e.g. "Seeking co-author for supernatural series"'
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
          />
          <textarea
            suppressHydrationWarning
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the project, your writing style, what you're looking for in a co-author…"
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition resize-none"
          />
          <input
            suppressHydrationWarning
            value={genres}
            onChange={e => setGenres(e.target.value)}
            placeholder="Genres / moods (optional) e.g. Cosmic, Action"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
          />

          {/* Action buttons: Post (primary) + Cancel (secondary) */}
          <div className="flex gap-2">
            <button
              onClick={handlePost}
              disabled={submitting}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              {/* Label changes during the in-flight POST */}
              {submitting ? 'Posting…' : 'Post Request'}
            </button>
            <button
              // Also clear the error so it doesn't reappear when the form opens again
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-4 py-2 border border-gray-700 text-gray-400 hover:text-white text-sm rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Request listings ──────────────────────────────────────────── */}
      {requests.length === 0 ? (
        // Empty state — shown when no requests exist yet
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-semibold text-gray-400 mb-1">No open requests yet</p>
          <p className="text-sm">Be the first to post a co-author request.</p>
        </div>
      ) : (
        requests.map(request => (
          <div
            key={request.id}
            // Closed requests are muted with opacity-60 so open ones stand out
            className={`border rounded-xl p-5 ${request.isOpen ? 'border-gray-800 bg-gray-900' : 'border-gray-800/50 bg-gray-900/50 opacity-60'}`}
          >
            {/* ── Header row: avatar + title + status badge ─────────── */}
            <div className="flex items-start gap-3 mb-3">

              {/* Author avatar — falls back to a letter-initial placeholder */}
              {request.author.profile?.avatar ? (
                <Image
                  src={request.author.profile.avatar}
                  alt={request.author.username}
                  width={36}
                  height={36}
                  // Next.js Image handles srcset and lazy loading automatically
                  className="rounded-full flex-shrink-0 object-cover"
                />
              ) : (
                // Fallback: grey circle with the first letter of the username
                <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-gray-400">
                    {request.author.username[0].toUpperCase()}
                  </span>
                </div>
              )}

              {/* Title + byline */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{request.title}</h3>
                <p className="text-xs text-gray-500">
                  by{' '}
                  {/* Link to the author's public profile page */}
                  <Link href={`/user/${request.author.username}`} className="text-gray-400 hover:text-white transition">
                    {request.author.username}
                  </Link>
                  {' · '}
                  {/* Format the ISO date string to "Jan 1" style */}
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Status badge — green for open, grey for closed */}
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                request.isOpen ? 'bg-green-500/15 text-green-400' : 'bg-gray-700 text-gray-500'
              }`}>
                {request.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            {/* Description — whitespace-pre-wrap preserves intentional line breaks */}
            <p className="text-sm text-gray-400 leading-relaxed mb-3 whitespace-pre-wrap">{request.description}</p>

            {/* ── Genre pills ───────────────────────────────────────── */}
            {request.genres && (
              // Only render if the genres field is non-null and non-empty
              <div className="flex flex-wrap gap-1.5 mb-3">
                {/*
                  Split the comma-separated string into individual tokens.
                  .trim() removes any whitespace around commas ("Cosmic , Action").
                */}
                {request.genres.split(',').map(g => (
                  <span key={g} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
                    {g.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* ── Author action: toggle open/closed ─────────────────── */}
            {/*
              Only visible to the request's original author (currentUserId === request.authorId).
              Other users see no action here — they would DM the author via their profile.
            */}
            {currentUserId === request.authorId && (
              <button
                onClick={() => handleToggle(request.id)}
                className="text-xs text-gray-500 hover:text-gray-300 transition underline"
              >
                {request.isOpen ? 'Mark as Filled' : 'Reopen Request'}
              </button>
            )}
          </div>
        ))
      )}

      {/* ── Login prompt for guests ────────────────────────────────── */}
      {!currentUserId && (
        <p className="text-center text-sm text-gray-500 py-4">
          <Link href="/login" className="text-red-400 hover:text-red-300 transition">Sign in</Link> to post a co-author request.
        </p>
      )}
    </div>
  );
}
