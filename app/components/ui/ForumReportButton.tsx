'use client';
// ForumReportButton.tsx
// A small client component that renders a "Report" button for forum posts and replies.
// Because forum pages are server components, this thin client wrapper handles
// the modal state and API call without making the whole page a client component.

import { useState } from 'react';

// Which type of forum content is being reported
type ReportType = 'FORUM_POST' | 'FORUM_REPLY';

type Props = {
  targetId: number;      // ID of the post or reply being reported
  type: ReportType;
  authorUsername: string; // Username of the content author
  currentUsername: string | null; // Logged-in user's username (null = not logged in)
};

// List of reasons the user can choose from
const REASONS = [
  { value: 'HARASSMENT',    label: 'Harassment or bullying' },
  { value: 'HATE_SPEECH',   label: 'Hate speech' },
  { value: 'SPAM',          label: 'Spam' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'THREATS',       label: 'Threats or violence' },
  { value: 'OTHER',         label: 'Other' },
];

export default function ForumReportButton({
  targetId,
  type,
  authorUsername,
  currentUsername,
}: Props) {
  // Don't render anything if the viewer is not logged in, or is the author
  if (!currentUsername || currentUsername === authorUsername) return null;

  // Controls whether the modal is open
  const [open, setOpen] = useState(false);
  // The selected reason
  const [reason, setReason] = useState('');
  // Optional extra note from the reporter
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Switches to a thank-you message after successful submission
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, targetId, reason, note }),
    });
    setSubmitting(false);
    setDone(true); // Show confirmation
  };

  const close = () => {
    // Reset state when closing so the form is fresh next time
    setOpen(false);
    setReason('');
    setNote('');
    setDone(false);
  };

  return (
    <>
      {/* Small "Report" trigger button shown next to forum content */}
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-600 hover:text-yellow-500 transition py-6"
        title="Report this content"
      >
        Report
      </button>

      {/* Modal — only rendered when open */}
      {open && (
        // Dark backdrop — clicking closes the modal
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={close}
        >
          {/* Modal panel — scrollable so it never gets cut off on small screens */}
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click from firing
          >
            {done ? (
              // Confirmation screen after report is sent
              <div className="text-center py-4">
                <p className="text-white font-semibold mb-1">Report submitted</p>
                <p className="text-sm text-gray-400 mb-4">
                  Thank you — our moderators will review it soon.
                </p>
                <button
                  onClick={close}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-1">Report content</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Why are you reporting this? Our team will review it.
                </p>

                {/* Reason radio buttons */}
                <div className="space-y-2 mb-4">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition ${
                        reason === r.value
                          ? 'border-red-500 bg-red-500/10 text-white'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`report-reason-${targetId}`}
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-red-500"
                      />
                      <span className="text-sm">{r.label}</span>
                    </label>
                  ))}
                </div>

                {/* Optional extra details */}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add more details (optional)…"
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-600 transition mb-4"
                />

                {/* Action buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={close}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={!reason || submitting}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                  >
                    {submitting ? 'Sending…' : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
