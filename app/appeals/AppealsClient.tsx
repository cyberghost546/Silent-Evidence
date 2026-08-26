'use client';
// app/appeals/AppealsClient.tsx
// Client interactions for the user Appeals page: filing an appeal against a
// moderation decision. The list itself is rendered server-side; this component
// owns the per-decision appeal form and its submission state.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfToken } from '@/lib/getCsrfToken';

type Appeal = {
  id: number;
  status: 'OPEN' | 'UPHELD' | 'OVERTURNED';
  message: string;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type ModerationActionView = {
  id: number;
  type: string;
  targetType: string;
  reason: string;
  explanation: string;
  legalGround: string | null;
  automated: boolean;
  status: 'ACTIVE' | 'REVERSED';
  createdAt: string;
  appeals: Appeal[];
};

const ACTION_LABEL: Record<string, string> = {
  CONTENT_REMOVED: 'Content removed',
  CONTENT_HIDDEN: 'Content restricted',
  CONTENT_REJECTED: 'Content not published',
  WARNING: 'Warning',
  ACCOUNT_SUSPENDED: 'Account suspended',
  ACCOUNT_BANNED: 'Account terminated',
};

const APPEAL_BADGE: Record<Appeal['status'], string> = {
  OPEN: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  UPHELD: 'bg-gray-600/20 text-gray-400 border-gray-600/40',
  OVERTURNED: 'bg-green-500/15 text-green-400 border-green-500/30',
};

export default function AppealsClient({ actions }: { actions: ModerationActionView[] }) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-20 text-gray-600">
        <p>No moderation decisions on your account.</p>
        <p className="mt-2 text-sm">If we ever remove your content or restrict your account, it will appear here with the reason and a way to appeal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actions.map((action) => (
        <ActionCard key={action.id} action={action} />
      ))}
    </div>
  );
}

function ActionCard({ action }: { action: ModerationActionView }) {
  const router = useRouter();
  const appeal = action.appeals[0] ?? null;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reversed = action.status === 'REVERSED';

  const submit = async () => {
    setError('');
    if (message.trim().length < 10) { setError('Please write at least 10 characters.'); return; }
    setLoading(true);
    const res = await fetch('/api/appeals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': await getCsrfToken() },
      body: JSON.stringify({ actionId: action.id, message: message.trim() }),
    });
    setLoading(false);
    if (res.ok) { router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Could not submit appeal.'); }
  };

  return (
    <div className={`border rounded-xl p-5 ${reversed ? 'border-green-900/40 bg-green-950/10' : 'border-gray-800 bg-gray-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {ACTION_LABEL[action.type] ?? action.type}
            {reversed && <span className="ml-2 text-xs text-green-400">(reversed)</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(action.createdAt).toLocaleDateString()} · {action.targetType.toLowerCase().replace('_', ' ')}
            {action.automated && <span className="ml-2 text-gray-600">automated decision</span>}
          </p>
        </div>
      </div>

      {/* Statement of reasons */}
      <div className="mt-3 text-sm text-gray-300">
        <p><span className="text-gray-500">Reason:</span> {action.explanation}</p>
        {action.legalGround && <p className="text-xs text-gray-500 mt-1">Basis: {action.legalGround}</p>}
      </div>

      {/* Appeal state / action */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        {appeal ? (
          <div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${APPEAL_BADGE[appeal.status]}`}>
              Appeal {appeal.status.toLowerCase()}
            </span>
            <p className="text-xs text-gray-500 mt-2">Your appeal: {appeal.message}</p>
            {appeal.decisionNote && <p className="text-xs text-gray-400 mt-1">Reviewer: {appeal.decisionNote}</p>}
          </div>
        ) : reversed ? (
          <p className="text-xs text-gray-500">This decision has been reversed. No appeal needed.</p>
        ) : !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition"
          >
            Request a review
          </button>
        ) : (
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Explain why you think this was wrong. A person will review it.</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={4000}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
              placeholder="Your appeal…"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={submit} disabled={loading} className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50">
                {loading ? 'Submitting…' : 'Submit appeal'}
              </button>
              <button type="button" onClick={() => { setOpen(false); setError(''); }} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
