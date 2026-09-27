'use client';
// app/dashboard/earnings/EarningsClient.tsx
// The author earnings dashboard: gross by source, the platform-fee split, the
// available balance, Stripe Connect onboarding, and withdrawing. Fetches from
// /api/author/earnings on mount so the numbers are always live.

import { useEffect, useState, useCallback } from 'react';
import { getCsrfToken } from '@/lib/getCsrfToken';

interface Earnings {
  gross: { tips: number; stories: number; chapters: number; bundles: number; total: number };
  net: number;
  fee: number;
  feeBps: number;
  paidOut: number;
  available: number;
  counts: { tips: number; stories: number; chapters: number; bundles: number };
}
interface Data {
  earnings: Earnings;
  payouts: { id: number; amountCents: number; status: string; createdAt: string }[];
  connect: { started: boolean; onboarded: boolean };
  payoutsConfigured: boolean;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function EarningsClient() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/author/earnings');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount. setState happens inside load()'s async callback,
    // after the await — not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // If we returned from Stripe onboarding, refresh Connect status server-side.
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('connect')
    ) {
      fetch('/api/author/connect')
        .then(() => load())
        .catch(() => {});
    }
  }, [load]);

  const startOnboarding = async () => {
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/author/connect', {
      method: 'POST',
      headers: { 'x-csrf-token': await getCsrfToken() },
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      window.location.href = d.url;
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error ?? 'Could not start setup.');
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/author/payout', {
      method: 'POST',
      headers: { 'x-csrf-token': await getCsrfToken() },
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(`Withdrew ${money(d.amountCents)}.`);
      load();
    } else setMsg(d.error ?? 'Could not withdraw.');
  };

  if (loading) return <p className="text-gray-500 text-sm py-12 text-center">Loading earnings…</p>;
  if (!data)
    return <p className="text-gray-500 text-sm py-12 text-center">Could not load earnings.</p>;

  const e = data.earnings;
  const sources: [string, number, number][] = [
    ['Tips', e.gross.tips, e.counts.tips],
    ['Story sales', e.gross.stories, e.counts.stories],
    ['Chapter sales', e.gross.chapters, e.counts.chapters],
    ['Bundle sales', e.gross.bundles, e.counts.bundles],
  ];

  return (
    <div className="space-y-6">
      {/* Headline balance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Available to withdraw" value={money(e.available)} accent />
        <Stat label="Net earned (all time)" value={money(e.net)} />
        <Stat label="Paid out" value={money(e.paidOut)} />
      </div>

      {/* Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Where it came from</h2>
        <div className="space-y-2">
          {sources.map(([label, gross, count]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {label} <span className="text-gray-600">· {count}</span>
              </span>
              <span className="text-gray-200">{money(gross)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-800">
            <span className="text-gray-400">Gross total</span>
            <span className="text-gray-200 font-semibold">{money(e.gross.total)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Platform fee ({(e.feeBps / 100).toFixed(0)}%)</span>
            <span>−{money(e.fee)}</span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-800">
            <span className="text-gray-300">Your net</span>
            <span className="text-green-400 font-semibold">{money(e.net)}</span>
          </div>
        </div>
      </div>

      {/* Payout / Connect */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Getting paid</h2>
        {!data.payoutsConfigured ? (
          <p className="text-xs text-gray-500">
            Your earnings are being tracked. Withdrawals open once the site finishes connecting its
            payment provider.
          </p>
        ) : !data.connect.onboarded ? (
          <>
            <p className="text-xs text-gray-500 mb-3">
              Set up payouts with Stripe to withdraw your balance. You&apos;ll be taken to Stripe to
              add your details securely.
            </p>
            <button
              type="button"
              onClick={startOnboarding}
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {busy ? 'Opening…' : data.connect.started ? 'Finish payout setup' : 'Set up payouts'}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">
              Payouts are set up. Withdraw your available balance to your bank via Stripe.
            </p>
            <button
              type="button"
              onClick={withdraw}
              disabled={busy || e.available < 1000}
              className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {busy ? 'Processing…' : `Withdraw ${money(e.available)}`}
            </button>
            {e.available < 1000 && (
              <p className="text-[11px] text-gray-600 mt-2">Minimum withdrawal is $10.00.</p>
            )}
          </>
        )}
        {msg && <p className="text-xs text-gray-400 mt-3">{msg}</p>}
      </div>

      {/* Payout history */}
      {data.payouts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Payout history</h2>
          <div className="space-y-1.5">
            {data.payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                <span className="text-gray-300">{money(p.amountCents)}</span>
                <span
                  className={
                    p.status === 'paid'
                      ? 'text-green-400'
                      : p.status === 'failed'
                        ? 'text-red-400'
                        : 'text-amber-400'
                  }
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl p-4 border ${accent ? 'bg-red-950/20 border-red-900/40' : 'bg-gray-900 border-gray-800'}`}
    >
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${accent ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
