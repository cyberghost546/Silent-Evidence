'use client';
/**
 * app/admin/newsletter/AdminNewsletterClient.tsx
 * ───────────────────────────────────────────────
 * PURPOSE:
 *   Admin control panel for the weekly newsletter email blast.
 *   Before sending, the admin can see a preview of which stories will be
 *   included and how many subscribers will receive the email.
 *   Clicking "Send" triggers the actual email delivery via the API.
 *
 * HOW IT WORKS:
 *   1. The parent server page fetches the preview data (top stories + subscriber
 *      count) and passes it as `initialPreview` — no loading spinner on first render.
 *   2. The admin reviews the story cards.  They can click "↻ Refresh preview"
 *      to re-fetch in case new stories were published since the page loaded.
 *   3. Clicking "Send" calls POST /api/admin/newsletter, which loops over all
 *      subscribed users and sends each one a personalised email.
 *   4. The result summary (sent / skipped / failed counts) replaces the button
 *      feedback area once the POST completes.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - The "preview → confirm → send → result" flow is a safe pattern for any
 *     bulk action that affects many users.  Never send without a preview step.
 *   - `initialPreview` passed from the server component avoids an extra client-side
 *     fetch on mount — always a good practice for admin dashboards.
 *   - The disabled send button guard (`stories.length === 0 || subscriberCount === 0`)
 *     prevents accidental sends when there's nothing to send.
 */

import { useState } from 'react';
import { Mail, Heart, Eye, MessageCircle, CheckCircle2, SkipForward, XCircle, Send } from 'lucide-react';

// ── Type definitions ──────────────────────────────────────────────────────────

// A single story shown in the preview card list
type Story = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;    // URL of the cover photo shown as a thumbnail
  views: number;
  author: { username: string };
  category: { name: string };
  _count: { likes: number; comments: number }; // Prisma nested count syntax
  score: number;  // engagement score computed server-side to rank stories
};

// The preview payload returned by GET /api/admin/newsletter
type PreviewData = {
  stories: Story[];          // top stories of the past 7 days (up to 5)
  subscriberCount: number;   // total users with newsletter opt-in
};

// The result returned by POST /api/admin/newsletter after sending
type SendResult = {
  sent: number;      // how many emails were successfully delivered
  skipped: number;   // subscribers already emailed recently (de-duplication)
  failed: number;    // delivery errors
  topStories: { title: string; slug: string }[]; // stories that were included
};

type Props = {
  // Pre-loaded by the server component to avoid a client-side fetch on mount.
  // Passing server data as a prop is faster than fetching it client-side.
  initialPreview: PreviewData;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminNewsletterClient({ initialPreview }: Props) {
  // The preview data (stories + subscriber count) shown before sending.
  // Starts as whatever the server fetched; can be refreshed with the button.
  const [preview, setPreview]   = useState<PreviewData>(initialPreview);

  // True while the POST /api/admin/newsletter request is in flight
  const [sending, setSending]   = useState(false);

  // Populated with send stats after a successful POST.
  // null = digest hasn't been sent yet in this session.
  const [result, setResult]     = useState<SendResult | null>(null);

  // Error message shown if the API returns a non-OK response
  const [error, setError]       = useState('');

  // True while the GET /api/admin/newsletter refresh call is in flight
  const [refreshing, setRefreshing] = useState(false);

  // ── Refresh preview ────────────────────────────────────────────────────────

  // Re-fetches the preview endpoint so the story list reflects any new
  // stories published since the page first loaded.
  // Uses a try/finally so `refreshing` is always cleared even if the fetch throws.
  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/newsletter');
      if (res.ok) setPreview(await res.json());
    } finally {
      setRefreshing(false);
    }
  };

  // ── Send newsletter ────────────────────────────────────────────────────────

  // Triggers the actual email blast via POST /api/admin/newsletter.
  // The server selects the top stories, renders each subscriber's personalised
  // email, and sends them via the configured email provider (e.g. Resend).
  const sendNewsletter = async () => {
    setSending(true);
    setError('');
    setResult(null); // clear any previous result so the success box disappears

    const res = await fetch('/api/admin/newsletter', { method: 'POST' });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      // Show the error message from the API (or a default if none provided)
      setError(data.error ?? 'Failed to send newsletter.');
      return;
    }
    // Store the result so the success summary box renders below the send button
    setResult(data as SendResult);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-1">Weekly Newsletter</h1>
      <p className="text-gray-500 text-sm mb-8">
        Preview this week&apos;s top stories then send the digest to all subscribed users.
      </p>

      {/* Subscriber count pill */}
      <div className="flex items-center gap-3 mb-6">
        <span className="px-4 py-2 bg-red-600/10 border border-red-600/30 text-red-400 text-sm font-semibold rounded-xl">
 {preview.subscriberCount.toLocaleString()} subscribers
        </span>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-xs text-gray-500 hover:text-white transition disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh preview'}
        </button>
      </div>

      {/* Top stories preview */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 bg-red-600 rounded-full" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
            Top Stories This Week
          </h2>
        </div>

        {preview.stories.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No stories published in the last 7 days.</p>
            <p className="text-gray-600 text-xs mt-1">The newsletter will not be sent if there are no stories.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {preview.stories.map((story, i) => (
              <div
                key={story.id}
                className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4 items-start"
              >
                {/* Rank */}
                <span className="text-2xl font-black text-gray-700 w-6 flex-shrink-0 leading-none mt-0.5">
                  {i + 1}
                </span>
                {/* Cover thumbnail */}
                {story.coverImage && (
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-0.5">
                    {story.category.name}
                  </p>
                  <p className="text-sm font-semibold text-white truncate">{story.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center flex-wrap gap-x-1">
                    <span>by {story.author.username}</span>
                    <span>&nbsp;·&nbsp;</span>
                    <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" /> {story._count.likes}</span>
                    <span>&nbsp;·&nbsp;</span>
                    <span className="inline-flex items-center gap-0.5"><Eye className="w-3 h-3" /> {story.views.toLocaleString()}</span>
                    <span>&nbsp;·&nbsp;</span>
                    <span className="inline-flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {story._count.comments}</span>
                  </p>
                </div>
                {/* Engagement score */}
                <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-1 rounded-lg flex-shrink-0">
                  Score {Math.round(story.score)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Send result summary */}
      {result && (
        <div className="mb-6 px-4 py-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 font-semibold text-sm mb-1">Newsletter sent!</p>
          <p className="text-xs text-gray-400 flex items-center flex-wrap gap-x-2">
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-red-400" /> {result.sent} delivered</span>
            <span>&nbsp;·&nbsp;</span>
            <span className="inline-flex items-center gap-1"><SkipForward className="w-3 h-3" /> {result.skipped} skipped</span>
            <span>&nbsp;·&nbsp;</span>
            <span className="inline-flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> {result.failed} failed</span>
          </p>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={sendNewsletter}
        disabled={sending || preview.stories.length === 0 || preview.subscriberCount === 0}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
      >
        {sending ? <span className="inline-flex items-center gap-1.5"><Send className="w-4 h-4" /> Sending…</span> : <span className="inline-flex items-center gap-1.5"><Send className="w-4 h-4" /> Send to {preview.subscriberCount} subscribers</span>}
      </button>

      {preview.stories.length === 0 && (
        <p className="text-xs text-gray-600 mt-2">Cannot send — no stories this week.</p>
      )}
    </div>
  );
}
