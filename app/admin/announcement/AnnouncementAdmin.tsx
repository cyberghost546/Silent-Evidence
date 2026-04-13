'use client';
/**
 * AnnouncementAdmin.tsx
 * ---------------------
 * PURPOSE:
 *   Renders a small admin form that lets you set or clear the site-wide
 *   announcement banner — the red bar that appears at the very top of every page.
 *   Changes take effect immediately for all new page loads.
 *
 * HOW IT WORKS:
 *   1. The parent server page reads the current announcement text from the
 *      database and passes it in as the `current` prop.
 *   2. The admin types a new message (or edits the existing one) in a textarea.
 *   3. Clicking "Save" sends a POST request to /api/admin/announcement with
 *      the new text.  Clicking "Clear banner" sends a DELETE request to remove it.
 *   4. After a successful save or clear, router.refresh() re-runs the server
 *      component so the live preview at the top of the page reflects the change.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - Replace the API path (/api/admin/announcement) with whatever endpoint
 *     handles your site setting.
 *   - Pass the initial value as a prop from a server component to avoid a
 *     client-side fetch on mount.
 *   - The "save / clear / status" pattern here is a clean template for any
 *     single-field admin setting form.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// The component receives the currently-saved announcement text from the server.
// `current` will be an empty string if no announcement is set.
export default function AnnouncementAdmin({ current }: { current: string }) {
  // useRouter gives us router.refresh() which re-runs the server component
  // so the live preview at the top of the page updates after saving.
  const router = useRouter();

  // `message` holds what is currently in the textarea.
  // It starts as whatever is already saved in the database (passed via `current`).
  const [message, setMessage] = useState(current);

  // `saving` is true while any API request is in flight — used to disable buttons
  // so the admin can't click "Save" twice and send duplicate requests.
  const [saving,  setSaving]  = useState(false);

  // `status` drives the small feedback text below the textarea:
  //   'saved'   → green "Announcement updated."
  //   'cleared' → gray "Announcement cleared."
  //   'error'   → red "Something went wrong."
  //   ''        → nothing shown
  const [status,  setStatus]  = useState('');

  // ── Save a new (or updated) announcement message ────────────────────────────
  // Called when the admin clicks "Save announcement".
  // Sends the current textarea value to the server via POST.
  const save = async () => {
    // Guard: don't save if the textarea is empty or only whitespace
    if (!message.trim()) return;
    setSaving(true);
    setStatus('');
    const res = await fetch('/api/admin/announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    setSaving(false);
    setStatus(res.ok ? 'saved' : 'error');
    // router.refresh() tells Next.js to re-run the server component so the
    // preview at the top of the page shows the newly saved message.
    if (res.ok) router.refresh();
  };

  // ── Remove the current announcement entirely ────────────────────────────────
  // Called when the admin clicks "Clear banner".
  // Sends a DELETE request — the server removes the announcement from the DB.
  const clear = async () => {
    // Browser confirm dialog prevents accidental clears
    if (!confirm('Remove the current announcement?')) return;
    setSaving(true);
    setStatus('');
    const res = await fetch('/api/admin/announcement', { method: 'DELETE' });
    setSaving(false);
    if (res.ok) {
      setMessage('');        // empty the textarea so the preview disappears
      setStatus('cleared');
      router.refresh();      // re-sync the server component
    } else {
      setStatus('error');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Announcement Banner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set a site-wide message that appears at the top of every page. Leave blank and clear to hide it.
        </p>
      </div>

      {/* Live preview of how the banner will look */}
      {message.trim() && (
        <div className="mb-6 rounded-xl overflow-hidden border border-gray-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-4 py-2 border-b border-gray-800">Preview</p>
          <div className="bg-red-700 text-white text-sm px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex-1 text-center font-medium">{message}</div>
            <span className="text-xs opacity-60">[×]</span>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="e.g. ⚠️ Site maintenance scheduled for Sunday 2am–4am UTC."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {status === 'saved'   && <p className="text-xs text-red-400">Announcement updated.</p>}
        {status === 'cleared' && <p className="text-xs text-gray-400">Announcement cleared.</p>}
        {status === 'error'   && <p className="text-xs text-red-400">Something went wrong. Try again.</p>}

        <div className="flex gap-3">
          {/* Clear button only shown if there is an existing message */}
          {current && (
            <button
              onClick={clear}
              disabled={saving}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 text-sm rounded-xl transition"
            >
              Clear banner
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !message.trim()}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {saving ? 'Saving…' : 'Save announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}
