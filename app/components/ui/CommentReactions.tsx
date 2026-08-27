'use client';
// ============================================================
// FILE: CommentReactions.tsx
// PURPOSE: Emoji reaction row displayed beneath each comment.
//          Logged-in users can click any emoji to toggle their reaction on/off.
//          Counts update immediately (optimistic update) and are confirmed
//          or rolled back based on the server response.
//
// KEY CONCEPT — Optimistic updates with rollback:
//   When the user clicks an emoji:
//     1. We immediately flip the count and mine list in state (feels instant).
//     2. We fire the API call in the background.
//     3. If the API throws (network error), the .catch() handler reverts the
//        count and mine list back to where they were before the click.
//   This is the full optimistic-update pattern — instant UI + safe rollback.
//
// KEY CONCEPT — showing emojis conditionally:
//   Logged-in users see all five emojis (so they can always react).
//   Guests only see emojis that already have at least one reaction (no point
//   showing empty buttons to someone who can't click them).
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Change the EMOJIS array to any set of reactions you want.
//   - Pass initialCounts (a Record<emoji, count>) and initialMine (string[])
//     from the server so the UI is correct on first render.
//   - The optimistic-update-with-rollback pattern in toggle() can be copied
//     verbatim for any toggle action (likes, bookmarks, etc.).
// ============================================================

import { useState } from 'react';
import { COMMENT_REACTIONS } from '@/lib/reactions';

// The available reactions, defined once in lib/reactions. Each has a stored id
// (what goes in the database) and an icon (what the reader actually sees).
const EMOJIS = COMMENT_REACTIONS.map((r) => r.id);

type Props = {
  commentId: number;
  // Initial aggregated counts from the server: { "👍": 3, "😱": 1 }
  initialCounts: Record<string, number>;
  // Which emojis the current user has already reacted with
  initialMine: string[];
  // Whether the viewer is logged in (controls interactivity)
  isLoggedIn: boolean;
};

export default function CommentReactions({
  commentId,
  initialCounts,
  initialMine,
  isLoggedIn,
}: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<string[]>(initialMine);
  const [loading, setLoading] = useState<string | null>(null);

  // Toggle a reaction — optimistic update then confirm with server
  const toggle = async (emoji: string) => {
    if (!isLoggedIn || loading) return;
    setLoading(emoji);

    const alreadyReacted = mine.includes(emoji);

    // Optimistic update: flip the count and mine list immediately
    setCounts((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] ?? 0) + (alreadyReacted ? -1 : 1),
    }));
    setMine((prev) => (alreadyReacted ? prev.filter((e) => e !== emoji) : [...prev, emoji]));

    // Send to API
    await fetch(`/api/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    }).catch(() => {
      // On error, revert the optimistic update
      setCounts((prev) => ({
        ...prev,
        [emoji]: (prev[emoji] ?? 0) + (alreadyReacted ? 1 : -1),
      }));
      setMine((prev) => (alreadyReacted ? [...prev, emoji] : prev.filter((e) => e !== emoji)));
    });

    setLoading(null);
  };

  // Only show emojis that have at least 1 reaction OR all of them if logged in
  const toShow = isLoggedIn ? EMOJIS : EMOJIS.filter((e) => (counts[e] ?? 0) > 0);

  if (!isLoggedIn && toShow.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {toShow.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = mine.includes(emoji);
        const def = COMMENT_REACTIONS.find((r) => r.id === emoji);
        // Skip stored reactions that are no longer offered rather than
        // rendering a button with nothing in it.
        if (!def) return null;
        const Icon = def.icon;
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            disabled={!isLoggedIn || loading === emoji}
            title={
              isLoggedIn
                ? active
                  ? `Remove ${def.label}`
                  : `React with ${def.label}`
                : 'Log in to react'
            }
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${
              active
                ? 'bg-red-600/20 border-red-600/40 text-red-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
            } ${!isLoggedIn ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">{def.label}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
