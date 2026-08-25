'use client';
// Marks a security alert as reviewed.
//
// Acknowledging is not deleting: the alert stays in the table as a record of
// what happened and when, it just stops competing for attention. An incident log
// you can erase is worth much less afterwards, when you are trying to work out
// how long something had been going on.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

export default function AcknowledgeButton({ alertId }: { alertId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const acknowledge = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/security/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      if (!res.ok) throw new Error('failed');
      router.refresh();
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={acknowledge}
      disabled={busy}
      aria-label="Mark this alert as reviewed"
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 disabled:opacity-50 transition"
    >
      <Check className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
      {error ? 'Retry' : busy ? 'Saving…' : 'Reviewed'}
    </button>
  );
}
