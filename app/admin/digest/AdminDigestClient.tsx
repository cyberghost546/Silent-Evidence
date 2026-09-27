'use client';
// app/admin/digest/AdminDigestClient.tsx
// Admin UI for sending the author comment digest email.
//
// The "comment digest" is an email sent to every story author summarising
// comments their stories have received since the last time the digest ran.
// This helps authors stay engaged without being flooded by per-comment emails.
//
// The page shows two preview stats before sending:
//   - How many authors have published stories (potential recipients)
//   - How many new comments have been left in the last 7 days
//
// The actual sending is done server-side via POST /api/admin/digest.
// This component is 'use client' because it manages loading/result state
// and makes fetch calls on button click.

import { useState } from 'react';
import { CheckCircle2, MessageCircle, SkipForward, Send } from 'lucide-react';

// ── Type definitions ──────────────────────────────────────────────────────────

// Preview stats returned by GET /api/admin/digest
// (shown before sending so the admin knows what will happen)
type Preview = { authorCount: number; newComments: number };

// Result stats returned by POST /api/admin/digest after the emails are sent
type Result = { authorsNotified: number; totalComments: number; skipped: number };

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminDigestClient({ initialPreview }: { initialPreview: Preview }) {
  // Preview data shown in the stat cards — starts with server-fetched values,
  // can be refreshed by clicking "↻ Refresh stats".
  const [preview, setPreview] = useState(initialPreview);

  // True while the POST /api/admin/digest request is in flight
  const [sending, setSending] = useState(false);

  // Populated with the send result once the POST completes successfully.
  // null means the digest hasn't been sent yet this session.
  const [result, setResult] = useState<Result | null>(null);

  // Error message shown in a red box if the API call fails
  const [error, setError] = useState('');

  // True while the GET /api/admin/digest refresh request is in flight
  const [refreshing, setRefreshing] = useState(false);

  // ── Refresh preview stats ──────────────────────────────────────────────────

  // Re-fetches the preview data so the stat cards show up-to-date numbers.
  // Useful if new stories or comments have been added since the page loaded.
  const refresh = async () => {
    setRefreshing(true);
    const res = await fetch('/api/admin/digest');
    if (res.ok) setPreview(await res.json());
    setRefreshing(false);
  };

  // ── Send the digest ────────────────────────────────────────────────────────

  // Triggers the actual email send via POST /api/admin/digest.
  // The server loops over every author and sends them a personalised email
  // listing the new comments on their stories.
  const send = async () => {
    setSending(true);
    setError('');
    setResult(null); // clear any previous result so the success box disappears
    const res = await fetch('/api/admin/digest', { method: 'POST' });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed');
      return;
    }
    // Store the result so the success summary box is shown
    setResult(data);
  };

  return (
    <div className="max-w-xl">
      {/* ── Page heading ────────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-white mb-1">Comment Digest</h1>
      <p className="text-gray-500 text-sm mb-8">
        Send each story author a summary of comments they&apos;ve received since their last digest.
      </p>

      {/* ── Preview stat cards ───────────────────────────────────────────────── */}
      {/* Two large number cards give the admin a quick sense of scale before sending */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* How many authors will receive the email */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-3xl font-bold text-white">{preview.authorCount}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
            Authors with stories
          </p>
        </div>
        {/* How many comments have been left in the last 7 days */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-3xl font-bold text-white">{preview.newComments}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
            Comments (last 7 days)
          </p>
        </div>
      </div>

      {/* Refresh link — re-runs the GET to update both stat cards */}
      <button
        onClick={refresh}
        disabled={refreshing}
        className="text-xs text-gray-500 hover:text-white mb-6 transition disabled:opacity-50"
      >
        {refreshing ? 'Refreshing…' : '↻ Refresh stats'}
      </button>

      {/* ── Error message ────────────────────────────────────────────────────── */}
      {/* Only rendered when the API returns a non-OK response */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* ── Success result summary ───────────────────────────────────────────── */}
      {/* Shown after a successful send — breaks down how many authors were
          notified, how many comments were included, and how many were skipped
          (authors with no new comments since their last digest). */}
      {result && (
        <div className="mb-6 px-4 py-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 font-semibold text-sm mb-1">Digest sent!</p>
          <p className="text-xs text-gray-400 flex items-center flex-wrap gap-x-2">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-red-400" /> {result.authorsNotified} authors
              notified
            </span>
            <span>&nbsp;·&nbsp;</span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3 h-3" /> {result.totalComments} comments included
            </span>
            <span>&nbsp;·&nbsp;</span>
            {/* Skipped = authors who had no new comments — no email sent to them */}
            <span className="inline-flex items-center gap-1">
              <SkipForward className="w-3 h-3" /> {result.skipped} skipped (no new comments)
            </span>
          </p>
        </div>
      )}

      {/* ── Send button ──────────────────────────────────────────────────────── */}
      {/* Disabled when there are no authors (nothing to send) or while sending.
          The label updates dynamically to show recipient count and loading state. */}
      <button
        onClick={send}
        disabled={sending || preview.authorCount === 0}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
      >
        {sending ? (
          <span className="inline-flex items-center gap-1.5">
            <Send className="w-4 h-4" /> Sending…
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Send className="w-4 h-4" /> Send digest to {preview.authorCount} authors
          </span>
        )}
      </button>
    </div>
  );
}
