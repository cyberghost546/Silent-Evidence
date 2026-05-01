'use client';
// app/admin/verification/VerificationClient.tsx
//
// WHY 'use client'?
//   Approve/reject buttons trigger async API calls and optimistically update the
//   request's status badge in the list — that requires useState.
//
// PURPOSE:
//   Review panel for author verification applications. Pending applications are
//   shown with the author's reason and any links they provided. The admin can
//   approve (grants the blue checkmark badge) or reject (dismisses without action).
//
// STATE:
//   requests — local copy of the initial requests prop; mutated on each decision
//   loading  — the userId of the request currently being acted on (null = idle)
//              Using the userId (not a boolean) lets us disable only the specific
//              row's buttons, not all rows simultaneously.
//   msg      — brief success message shown after an action, auto-cleared after 3s
//
// OPTIMISTIC UPDATE PATTERN:
//   After the API call succeeds, we update `requests` locally with the new status
//   (`r.map(x => x.userId === userId ? { ...x, status: 'approved' } : x)`).
//   This avoids a page reload — the UI reflects the decision immediately.
//   The data in the database is the source of truth, but the local state keeps
//   the UI responsive without a refetch.
//
// `act()` is a single function for both approve and reject — the `action` parameter
//   controls which path the API takes. This avoids duplicating the fetch logic.
//
// LAYOUT:
//   `pending` — shown as full cards with approve/reject buttons
//   `decided` — collapsed in a <details> accordion (past decisions, low priority)

import { useState } from 'react';

// Request shape passed as a prop from the server component
type Request = {
  userId: number; username: string; reason: string; links: string;
  submittedAt: string; status: string;
};

export default function VerificationClient({ requests: initial }: { requests: Request[] }) {
  const [requests, setRequests] = useState(initial);
  // loading: userId of the row being acted on (null = no action in-flight)
  const [loading, setLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const act = async (userId: number, action: 'approve' | 'reject') => {
    setLoading(userId); // disable this row's buttons while the API call is in-flight
    const res = await fetch('/api/admin/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    if (res.ok) {
      // Optimistic update: mutate the status in local state (no page reload)
      setRequests(r => r.map(x => x.userId === userId ? { ...x, status: action === 'approve' ? 'approved' : 'rejected' } : x));
      setMsg(action === 'approve' ? 'User verified!' : 'Application rejected.');
      setTimeout(() => setMsg(''), 3000); // auto-clear the success message
    }
    setLoading(null);
  };

  // Split into two arrays to render pending first, decided in a collapsed section
  const pending = requests.filter(r => r.status === 'pending');
  const decided = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {pending.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center text-gray-500">
          No pending applications.
        </div>
      )}

      {pending.map(r => (
        <div key={r.userId} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="font-bold text-white text-lg">{r.username}</p>
              <p className="text-xs text-gray-500">Submitted {new Date(r.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => act(r.userId, 'approve')}
                disabled={loading === r.userId}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
              >
                {loading === r.userId ? '…' : '✓ Approve'}
              </button>
              <button
                onClick={() => act(r.userId, 'reject')}
                disabled={loading === r.userId}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
              >
                ✕ Reject
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed mb-2">{r.reason}</p>
          {r.links && <p className="text-xs text-gray-500 break-all">{r.links}</p>}
        </div>
      ))}

      {decided.length > 0 && (
        <details className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <summary className="text-sm text-gray-500 cursor-pointer">Past decisions ({decided.length})</summary>
          <div className="mt-4 space-y-2">
            {decided.map(r => (
              <div key={r.userId} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{r.username}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${r.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
