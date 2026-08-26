'use client';
// app/admin/appeals/AdminAppealsClient.tsx
// The admin appeals queue. Shows open appeals with the original decision and its
// statement of reasons, and lets a reviewer uphold or overturn — except appeals
// against their own actions, which the server also refuses (DSA independence).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfToken } from '@/lib/getCsrfToken';

type Appeal = {
  id: number;
  message: string;
  createdAt: string;
  canReview: boolean;
  user: { id: number; username: string };
  action: {
    id: number;
    type: string;
    targetType: string;
    targetId: number;
    reason: string;
    explanation: string;
    automated: boolean;
    moderator: { username: string } | null;
  };
};

export default function AdminAppealsClient({ appeals }: { appeals: Appeal[] }) {
  if (appeals.length === 0) {
    return <p className="text-gray-600 text-sm py-12 text-center">No open appeals. Nicely quiet.</p>;
  }
  return (
    <div className="space-y-4">
      {appeals.map((a) => <AppealRow key={a.id} appeal={a} />)}
    </div>
  );
}

function AppealRow({ appeal }: { appeal: Appeal }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState<'UPHELD' | 'OVERTURNED' | null>(null);
  const [error, setError] = useState('');

  const decide = async (decision: 'UPHELD' | 'OVERTURNED') => {
    setError('');
    setLoading(decision);
    const res = await fetch(`/api/admin/appeals/${appeal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': await getCsrfToken() },
      body: JSON.stringify({ decision, note: note.trim() || undefined }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Could not record decision.'); }
  };

  return (
    <div className="border border-gray-800 bg-gray-900 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            Appeal from {appeal.user.username}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(appeal.createdAt).toLocaleString()} · original action #{appeal.action.id} ({appeal.action.type})
          </p>
        </div>
      </div>

      {/* Original decision */}
      <div className="mt-3 bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm">
        <p className="text-xs uppercase tracking-wider text-gray-600 mb-1">Original decision</p>
        <p className="text-gray-300">{appeal.action.explanation}</p>
        <p className="text-xs text-gray-500 mt-1">
          {appeal.action.targetType} #{appeal.action.targetId} · reason {appeal.action.reason} ·{' '}
          {appeal.action.automated ? 'automated' : `by ${appeal.action.moderator?.username ?? 'unknown'}`}
        </p>
      </div>

      {/* The appeal */}
      <div className="mt-3 text-sm">
        <p className="text-xs uppercase tracking-wider text-gray-600 mb-1">Their appeal</p>
        <p className="text-gray-300">{appeal.message}</p>
      </div>

      {/* Decision controls */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        {appeal.canReview ? (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="Note to the user (optional)…"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 mb-2"
            />
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => decide('OVERTURNED')} disabled={loading !== null}
                className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50">
                {loading === 'OVERTURNED' ? 'Reversing…' : 'Overturn (reverse decision)'}
              </button>
              <button type="button" onClick={() => decide('UPHELD')} disabled={loading !== null}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition disabled:opacity-50">
                {loading === 'UPHELD' ? 'Recording…' : 'Uphold decision'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-amber-500/80">
            You made the original decision, so another admin must review this appeal.
          </p>
        )}
      </div>
    </div>
  );
}
