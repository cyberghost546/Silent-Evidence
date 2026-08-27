'use client';
// MyInvitesClient — renders the list of co-author invitations with Accept/Decline buttons.
// Each invite calls PATCH /api/collaborators/[id] with accepted: true/false.

import { useState } from 'react';
import Link from 'next/link';

type Invite = {
  id: number;
  accepted: boolean | null; // null = pending, true = accepted, false = declined
  createdAt: string;
  story: {
    id: number;
    title: string;
    slug: string;
    authorUsername: string;
  };
};

export default function MyInvitesClient({ invites: initial }: { invites: Invite[] }) {
  const [invites, setInvites] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null); // ID of the invite being processed

  const respond = async (id: number, accepted: boolean) => {
    setBusy(id);
    const res = await fetch(`/api/collaborators/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted }),
    });
    setBusy(null);
    if (res.ok) {
      // Update the local state so the UI reflects the decision immediately
      setInvites((prev) => prev.map((inv) => (inv.id === id ? { ...inv, accepted } : inv)));
    }
  };

  if (invites.length === 0) {
    return (
      <div className="text-center py-20 text-gray-600">
        <p>No co-author invitations yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invites.map((inv) => (
        <div
          key={inv.id}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-400">
              Invited by <span className="text-white font-medium">{inv.story.authorUsername}</span>
            </p>
            <Link
              href={`/story/${inv.story.slug}`}
              className="text-base font-semibold text-white hover:text-red-400 transition line-clamp-1 mt-0.5"
            >
              {inv.story.title}
            </Link>
            <p className="text-xs text-gray-600 mt-1">
              {new Date(inv.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Status badge or action buttons depending on response state */}
          {inv.accepted === null ? (
            // Pending — show Accept / Decline buttons
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => respond(inv.id, false)}
                disabled={busy === inv.id}
                className="px-4 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={() => respond(inv.id, true)}
                disabled={busy === inv.id}
                className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
              >
                {busy === inv.id ? '…' : 'Accept'}
              </button>
            </div>
          ) : (
            // Already responded — show the status as a badge
            <span
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full border ${
                inv.accepted
                  ? 'bg-green-500/10 border-green-500/40 text-green-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500'
              }`}
            >
              {inv.accepted ? 'Accepted' : 'Declined'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
