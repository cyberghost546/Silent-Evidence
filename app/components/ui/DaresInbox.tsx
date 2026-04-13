'use client';
// ============================================================
//  DaresInbox.tsx
//  Shows all dares sent to the logged-in user.
//  Each dare displays who sent it, which story they're being
//  dared to read, the optional message, and Accept/Decline buttons.
// ============================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ── Props ─────────────────────────────────────────────────────
type Props = {
  userId: number; // The logged-in user whose dares we're loading
};

// ── Shape of a single dare returned by the API ────────────────
type Dare = {
  id: number;
  message: string | null;    // Optional scary message from the sender
  accepted: boolean | null;  // null = pending, true = accepted, false = declined
  createdAt: string;
  story: { id: number; title: string; slug: string };
  sender: { id: number; username: string };
};

// ── Utility: human-readable relative time ────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DaresInbox({ userId }: Props) {
  // All dares received by this user
  const [dares, setDares] = useState<Dare[]>([]);

  // Loading state while the initial fetch is in-flight
  const [loading, setLoading] = useState(true);

  // Tracks which dare IDs are currently being accepted/declined
  // (prevents double-clicks and shows a spinner per-dare)
  const [processing, setProcessing] = useState<Set<number>>(new Set());

  // ── Fetch dares on mount ─────────────────────────────────────
  // We only run this once when the component mounts (empty dep array).
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/dares?receiverId=${userId}`);
        if (res.ok) {
          const data: Dare[] = await res.json();
          setDares(data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  // ── respond — accept or decline a dare ──────────────────────
  // Sends a PATCH to /api/dares/[id] and updates local state so
  // the UI reflects the new status without a full reload.
  const respond = async (dareId: number, accepted: boolean) => {
    // Mark this dare as "processing" to disable its buttons
    setProcessing((prev) => new Set(prev).add(dareId));

    try {
      const res = await fetch(`/api/dares/${dareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      });

      if (res.ok) {
        const updated: Dare = await res.json();
        // Replace the old dare entry in state with the updated one
        setDares((prev) =>
          prev.map((d) => (d.id === dareId ? { ...d, accepted: updated.accepted } : d))
        );
      }
    } finally {
      // Always remove from the processing set, even on failure
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(dareId);
        return next;
      });
    }
  };

  // ── Pending dares = dares where accepted is null ─────────────
  const pendingDares = dares.filter((d) => d.accepted === null);

  // ── Resolved dares = accepted or declined ────────────────────
  const resolvedDares = dares.filter((d) => d.accepted !== null);

  // ── Loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          // Pulsing placeholder cards while data loads
          <div key={i} className="h-24 bg-gray-900 rounded-xl animate-pulse border border-gray-800" />
        ))}
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────
  if (dares.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p className="text-3xl mb-3">💀</p>
        <p className="text-sm">No dares yet. Share a scary story with a friend!</p>
      </div>
    );
  }

  // ── Dare card component (defined inline for locality) ─────────
  // Renders a single dare — shows sender, story link, message, and action buttons.
  const DareCard = ({ dare }: { dare: Dare }) => {
    const isProcessing = processing.has(dare.id); // is this specific dare being acted on?
    const isPending = dare.accepted === null;

    return (
      <div
        className={`rounded-xl border p-5 transition ${
          isPending
            ? 'bg-gray-950 border-red-900/50 shadow-md shadow-red-950/30'
            : 'bg-gray-950/60 border-gray-800 opacity-70'
        }`}
      >
        {/* ── Header row: sender + time ───────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            {/* Ghost icon decorates the sender name */}
            <span className="text-lg">👻</span>
            <span className="text-sm font-semibold text-white">
              {dare.sender.username}
            </span>
            <span className="text-xs text-gray-600">dared you</span>
          </div>
          {/* Relative timestamp */}
          <span className="text-xs text-gray-600 shrink-0" suppressHydrationWarning>
            {timeAgo(dare.createdAt)}
          </span>
        </div>

        {/* ── Story link ──────────────────────────────────── */}
        {/* Clicking the story title takes the user to the story page */}
        <Link
          href={`/story/${dare.story.slug}`}
          className="block text-red-400 hover:text-red-300 font-medium text-sm mb-3 transition underline underline-offset-2"
        >
          📖 {dare.story.title}
        </Link>

        {/* ── Optional personal message ────────────────────── */}
        {/* Only rendered when the sender included a message */}
        {dare.message && (
          <blockquote className="border-l-2 border-red-700 pl-3 mb-4 text-sm text-gray-400 italic">
            "{dare.message}"
          </blockquote>
        )}

        {/* ── Action buttons or resolved badge ─────────────── */}
        {isPending ? (
          // Show Accept / Decline buttons for pending dares
          <div className="flex gap-3 mt-2">
            {/* Accept button — navigates to story and marks accepted */}
            <button
              onClick={() => respond(dare.id, true)}
              disabled={isProcessing}
              className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold transition"
            >
              {isProcessing ? '…' : '✓ Accept the Dare'}
            </button>

            {/* Decline button — marks declined, dims the card */}
            <button
              onClick={() => respond(dare.id, false)}
              disabled={isProcessing}
              className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 text-xs font-semibold transition"
            >
              {isProcessing ? '…' : '✕ Decline'}
            </button>
          </div>
        ) : (
          // Show a status badge for already-resolved dares
          <div className="mt-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                dare.accepted
                  ? 'bg-red-900/40 text-red-400'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {dare.accepted ? '💀 You accepted this dare' : 'Declined'}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Pending dares section ───────────────────────────────── */}
      {pendingDares.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-red-600 mb-3">
            Awaiting Your Courage ({pendingDares.length})
          </h3>
          <div className="space-y-4">
            {pendingDares.map((dare) => (
              <DareCard key={dare.id} dare={dare} />
            ))}
          </div>
        </section>
      )}

      {/* ── Resolved dares section (collapsed / dimmed) ─────────── */}
      {resolvedDares.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">
            Past Dares ({resolvedDares.length})
          </h3>
          <div className="space-y-4">
            {resolvedDares.map((dare) => (
              <DareCard key={dare.id} dare={dare} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
