'use client';
// ============================================================
// FILE: ChallengeActions.tsx
// PURPOSE: Renders the submission UI on a writing challenge page.
//          Handles every possible state the user can be in:
//            1. Challenge is not active   → renders nothing (null)
//            2. User is not logged in     → shows a "Log in" prompt
//            3. Already submitted         → shows a success confirmation
//            4. No published stories      → nudges user to write one
//            5. Ready to submit           → shows story picker + submit button
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - This multi-state guard pattern (check conditions in order, return early
//     for each one) keeps the "happy path" at the bottom and avoids deeply
//     nested JSX. Use it any time a component has several mutually exclusive
//     display states.
//   - The submitted state is seeded from userEntry (server-provided) but also
//     set to true after a successful POST, so the UI updates immediately without
//     a page reload.
//   - The story picker is a plain <select> — swap it for a custom dropdown if
//     you have many stories.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// challengeId  — DB id of the challenge being entered
// isActive     — if false, the whole component is hidden (challenge not running)
// isLoggedIn   — controls the "log in" prompt vs. the submission form
// userEntry    — non-null means the user already submitted; shows a confirmation message
// userStories  — the logged-in user's published stories to pick from
type Props = {
  challengeId: number;
  isActive: boolean;
  isLoggedIn: boolean;
  userEntry: { storyId: number } | null;
  userStories: { id: number; title: string }[];
};

export default function ChallengeActions({ challengeId, isActive, isLoggedIn, userEntry, userStories }: Props) {
  // storyId — selected story ID as a string (comes from the <select> value)
  const [storyId, setStoryId] = useState('');
  // loading — disables the submit button while the request is in flight
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  // submitted — true once the user successfully enters or if they already had an entry
  const [submitted, setSubmitted] = useState(!!userEntry);
  const router = useRouter();

  // POSTs the selected story ID to the challenge entries API
  const submit = async () => {
    if (!storyId) return;
    setLoading(true); setError('');
    const res = await fetch(`/api/challenges/${challengeId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: Number(storyId) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
    setSubmitted(true);
    router.refresh();
  };

  if (!isActive) return null;
  if (!isLoggedIn) return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-sm text-gray-400">
      <Link href="/login" className="text-red-400 hover:text-red-300 transition">Log in</Link> to submit your story to this challenge.
    </div>
  );
  if (submitted) return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-sm text-green-400">
      ✓ Your entry has been submitted. Good luck!
    </div>
  );
  if (userStories.length === 0) return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-sm text-gray-400">
      You need a published story to enter. <Link href="/write" className="text-red-400 hover:text-red-300 transition">Write one now →</Link>
    </div>
  );

  return (
    <div className="bg-gray-800 border border-red-600/20 rounded-xl p-5">
      <h3 className="font-semibold text-white mb-3">Submit Your Entry</h3>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <div className="flex gap-3">
        <select value={storyId} onChange={e => setStoryId(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition appearance-none">
          <option value="">Select a story to submit…</option>
          {userStories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button onClick={submit} disabled={loading || !storyId}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
          {loading ? 'Submitting…' : 'Submit'}
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-2">Only published stories can be submitted. One entry per challenge.</p>
    </div>
  );
}
