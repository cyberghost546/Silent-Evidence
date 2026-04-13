'use client';
/**
 * app/admin/reports/AdminReportsClient.tsx
 * ─────────────────────────────────────────
 * PURPOSE:
 *   Admin moderation queue for content reports submitted by users.
 *   When a user clicks "Report" on a story, comment, or forum post, a report
 *   record is created in the database.  This component lists those reports and
 *   lets admins act on them.
 *
 * HOW IT WORKS:
 *   1. The parent server page fetches all reports and passes them as the
 *      `reports` prop.
 *   2. Filter tabs ("ALL", "PENDING", "REVIEWED", "DISMISSED") narrow the list.
 *   3. Each pending report card has two action buttons:
 *      • "Mark Reviewed" — admin has looked at the content and taken action.
 *      • "Dismiss" — report was unfounded or not actionable.
 *   4. Clicking an action PATCHes /api/admin/reports/[id] and immediately
 *      updates the status badge in local state.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - The lookup-table pattern (TYPE_LABELS, REASON_LABELS, STATUS_COLORS) is
 *     a clean way to map database enum strings to UI-friendly labels and styles
 *     without scattering conditionals throughout the JSX.
 *   - The `updating` state (tracks which row's buttons are disabled) is a good
 *     pattern for tables where each row has its own async action.
 *   - `Record<string, string>` is a TypeScript type that means "an object whose
 *     keys and values are both strings" — great for lookup tables.
 */

import { useState } from 'react';

// ── Type definitions ──────────────────────────────────────────────────────────

// Shape of a single report record (dates serialised to strings from the server)
type Report = {
  id: number;
  type: string;         // COMMENT | STORY | FORUM_POST | FORUM_REPLY
  targetId: number;     // database ID of the thing being reported
  reason: string;       // e.g. HARASSMENT, SPAM — why it was reported
  note: string | null;  // optional free-text the user added when reporting
  status: string;       // PENDING | REVIEWED | DISMISSED
  createdAt: string;    // ISO date string — when the report was filed
  reporter: { username: string }; // who filed the report
};

type Props = { reports: Report[] };

// ── Lookup tables ─────────────────────────────────────────────────────────────

// Maps the raw database enum string to a human-readable label for the UI.
// Using a lookup table avoids a long if/else chain inside the JSX.
const TYPE_LABELS: Record<string, string> = {
  COMMENT:     'Comment',
  STORY:       'Story',
  FORUM_POST:  'Forum Post',
  FORUM_REPLY: 'Forum Reply',
};

// Same pattern for the reason enum values
const REASON_LABELS: Record<string, string> = {
  HARASSMENT:    'Harassment',
  HATE_SPEECH:   'Hate Speech',
  SPAM:          'Spam',
  INAPPROPRIATE: 'Inappropriate',
  THREATS:       'Threats',
  OTHER:         'Other',
};

// Tailwind colour classes for each status badge — kept in one place so they're
// easy to update without hunting through the JSX.
const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  REVIEWED:  'bg-red-500/20  text-red-400  border-red-500/30',
  DISMISSED: 'bg-gray-500/20   text-gray-400   border-gray-500/30',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminReportsClient({ reports: initial }: Props) {
  // Local copy of reports — updated when the admin changes a status so the
  // badge updates immediately without a full page reload.
  const [reports, setReports] = useState<Report[]>(initial);

  // The currently active filter tab — 'ALL' | 'PENDING' | 'REVIEWED' | 'DISMISSED'
  const [filter, setFilter] = useState('ALL');

  // The ID of the report currently being updated via API.
  // We use this to disable the buttons on that specific row while the request
  // is in flight, preventing double-clicks.  null = no row is loading.
  const [updating, setUpdating] = useState<number | null>(null);

  // ── Update a report's status ──────────────────────────────────────────────

  // Sends a PATCH request to change the status to REVIEWED or DISMISSED.
  // On success, updates local state so the badge changes immediately.
  const updateStatus = async (id: number, status: 'REVIEWED' | 'DISMISSED') => {
    setUpdating(id); // disable buttons on this row
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      // Replace only the updated report in the list, keeping all others the same.
      // The spread `{ ...r, status }` copies all existing fields and overwrites `status`.
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    }
    setUpdating(null); // re-enable buttons
  };

  // ── Derived values ────────────────────────────────────────────────────────

  // Filter the reports based on the active tab.
  // When filter is 'ALL', all reports are shown (no filtering needed).
  const visible = filter === 'ALL' ? reports : reports.filter((r) => r.status === filter);

  // How many reports still need admin attention — shown in the "Pending" tab badge
  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['ALL', 'PENDING', 'REVIEWED', 'DISMISSED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
              filter === f
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
            }`}
          >
            {f === 'PENDING' && pendingCount > 0 ? `Pending (${pendingCount})` : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <p className="text-gray-500 text-sm">No reports found.</p>
      )}

      {/* Reports table */}
      <div className="space-y-3">
        {visible.map((report) => (
          <div
            key={report.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5"
          >
            {/* Top row: type badge + status badge + date */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              {/* Type pill */}
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                {TYPE_LABELS[report.type] ?? report.type}
              </span>
              {/* Status pill */}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[report.status]}`}>
                {report.status}
              </span>
              {/* Date */}
              <span className="text-xs text-gray-600 ml-auto">
                {new Date(report.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>

            {/* Report details */}
            <div className="text-sm text-gray-300 space-y-1 mb-4">
              {/* What was reported */}
              <p>
                <span className="text-gray-500">Target ID:</span>{' '}
                <span className="font-mono text-white">#{report.targetId}</span>
              </p>
              {/* Who reported it */}
              <p>
                <span className="text-gray-500">Reported by:</span>{' '}
                <span className="text-white">@{report.reporter.username}</span>
              </p>
              {/* Reason */}
              <p>
                <span className="text-gray-500">Reason:</span>{' '}
                <span className="text-red-400 font-medium">
                  {REASON_LABELS[report.reason] ?? report.reason}
                </span>
              </p>
              {/* Optional note */}
              {report.note && (
                <p>
                  <span className="text-gray-500">Note:</span>{' '}
                  <span className="italic text-gray-300">{report.note}</span>
                </p>
              )}
            </div>

            {/* Action buttons — only shown on PENDING reports */}
            {report.status === 'PENDING' && (
              <div className="flex gap-3">
                <button
                  onClick={() => updateStatus(report.id, 'REVIEWED')}
                  disabled={updating === report.id}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
                >
                  {updating === report.id ? '…' : 'Mark Reviewed'}
                </button>
                <button
                  onClick={() => updateStatus(report.id, 'DISMISSED')}
                  disabled={updating === report.id}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-xs font-medium rounded-lg transition"
                >
                  {updating === report.id ? '…' : 'Dismiss'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
