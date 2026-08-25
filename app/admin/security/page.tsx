// app/admin/security/page.tsx
// Security dashboard — what the intrusion detection has actually seen.
//
// Two panels, in this order deliberately:
//   1. Open alerts, newest first. These are conclusions, not raw data.
//   2. Recent failed sign-ins, as the raw evidence behind them.
//
// The alerts come first because a log of failed logins is what already existed
// and nobody read. The value here is the interpretation.

import { redirect } from 'next/navigation';
import { ShieldAlert, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { requireAdmin } from '@/lib/session';
import { RULES, getSecurityOverview } from '@/lib/securityMonitor';
import AcknowledgeButton from './AcknowledgeButton';

export const metadata = { title: 'Security — Admin' };

// Newest first, and unacknowledged above acknowledged, so what needs attention
// is always at the top.
const SEVERITY_STYLE: Record<string, { chip: string; border: string }> = {
  critical: { chip: 'bg-red-500/15 text-red-300 border-red-500/40',     border: 'border-red-500/30' },
  high:     { chip: 'bg-orange-500/15 text-orange-300 border-orange-500/40', border: 'border-orange-500/25' },
  medium:   { chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40',   border: 'border-amber-500/20' },
  low:      { chip: 'bg-gray-700/40 text-gray-300 border-gray-600',         border: 'border-gray-800' },
};

function styleFor(severity: string) {
  return SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.low;
}

export default async function AdminSecurityPage() {
  // The admin layout already gates /admin/*, but this page shows attack detail,
  // so it re-checks rather than relying solely on a parent.
  const admin = await requireAdmin();
  if (!admin) redirect('/');

  const { alerts, openCount, recentFailures, failures24h } = await getSecurityOverview();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h1 className="text-2xl font-bold">Security</h1>
          {openCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/40">
              {openCount} open
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-8">
          {failures24h} failed sign-in {failures24h === 1 ? 'attempt' : 'attempts'} in the last 24 hours.
          Accounts lock for {RULES.lockoutMinutes} minutes after {RULES.lockoutThreshold} failures.
        </p>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        <h2 className="text-sm font-semibold mb-3">Alerts</h2>

        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center mb-10">
            <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-gray-300">No security alerts.</p>
            <p className="text-xs text-gray-600 mt-1">
              Detection runs on every failed sign-in. Nothing has crossed a threshold.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-10">
            {alerts.map((a) => {
              const s = styleFor(a.severity);
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border bg-gray-900 p-4 ${s.border} ${a.acknowledged ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${s.chip}`}>
                          {a.severity}
                        </span>
                        <span className="text-xs text-gray-600">{a.kind.replace(/_/g, ' ')}</span>
                        {a.acknowledged && (
                          <span className="text-[10px] uppercase tracking-wider text-gray-600">acknowledged</span>
                        )}
                      </div>

                      <p className="text-sm text-white">{a.summary}</p>

                      <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {a.createdAt.toLocaleString('en-GB')}
                        </span>
                        {a.ip && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            {a.ip}
                          </span>
                        )}
                      </p>

                      {a.detail && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">
                            Evidence
                          </summary>
                          <pre className="mt-2 text-[11px] text-gray-500 bg-gray-950 rounded-lg p-3 overflow-x-auto">
                            {JSON.stringify(JSON.parse(a.detail), null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    {!a.acknowledged && <AcknowledgeButton alertId={a.id} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Raw evidence ────────────────────────────────────────────────── */}
        <h2 className="text-sm font-semibold mb-3">Recent failed sign-ins</h2>

        {recentFailures.length === 0 ? (
          <p className="text-sm text-gray-600">None recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-gray-900">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-950">
                {recentFailures.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 text-gray-300">{f.email}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{f.ip}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {[f.city, f.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-right text-xs">
                      {f.createdAt.toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-700 mt-6 flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Source addresses are anonymised to the network (last octet removed), matching
            how sign-in attempts have always been logged — so one &ldquo;source&rdquo; may
            cover several devices behind the same router. High and critical alerts are also
            emailed to admins, grouped by the hour so a sustained attack sends one message
            rather than thousands.
          </span>
        </p>
      </div>
    </main>
  );
}
