'use client';
// 'use client' marks this as a Client Component — it runs in the browser.
// This is required because it uses useState (local state) and fetch() to
// send data to the API when the admin clicks the buttons. If it were a
// Server Component it could only render HTML and couldn't react to clicks.

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

// ── Props ─────────────────────────────────────────────────────────────────────
// `current` is the announcement text already stored in the database.
// The parent Server Component fetches it and passes it down so this Client
// Component doesn't need its own fetch-on-mount — the data arrives with the
// initial HTML, which is faster and avoids a loading flash.
// If no announcement is active, `current` will be an empty string "".
export default function AnnouncementAdmin({ current }: { current: string }) {
  // ── Router ────────────────────────────────────────────────────────────────
  // `router.refresh()` tells Next.js to re-run the parent Server Component on
  // the server and stream the updated HTML to the browser without a full page
  // reload. We call it after saving or clearing so the live banner preview at
  // the top of the admin page syncs with whatever is now in the database.
  const router = useRouter();

  // ── State ─────────────────────────────────────────────────────────────────

  // `message` mirrors the textarea value.
  // It is seeded with `current` so the admin sees the existing text on load
  // and can edit it in place rather than re-typing from scratch.
  const [message, setMessage] = useState(current);

  // `saving` is true while a fetch() call is in-flight.
  // Both buttons are disabled while saving is true so the admin can't send
  // duplicate requests by double-clicking.
  const [saving, setSaving] = useState(false);

  // `status` drives the feedback line shown below the textarea.
  // It is a string discriminant — we compare it to literal values in the JSX:
  //   'saved'   → "Announcement updated."  (green text)
  //   'cleared' → "Announcement cleared."  (gray text)
  //   'error'   → "Something went wrong."  (red text)
  //   ''        → nothing is shown
  const [status, setStatus] = useState('');

  // ── save() ────────────────────────────────────────────────────────────────
  // Sends the current textarea value to the server as a POST request.
  // The API upserts the announcement row in the database (creates it if it
  // doesn't exist, or updates it if it does).
  const save = async () => {
    // Early return: don't hit the network for an empty or whitespace-only message.
    // The Save button is also visually disabled in this case (see `disabled` prop),
    // but this guard covers keyboard shortcuts or other code paths.
    if (!message.trim()) return;

    setSaving(true);
    setStatus(''); // clear any previous feedback before the new request

    const res = await fetch('/api/admin/announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `message` is the current textarea value (controlled by state)
      body: JSON.stringify({ message }),
    });

    setSaving(false);

    // Set feedback based on whether the server returned a success (2xx) status
    setStatus(res.ok ? 'saved' : 'error');

    // Only refresh the server component when the save actually succeeded —
    // no point re-running the server query if we're in an error state.
    if (res.ok) router.refresh();
  };

  // ── clear() ───────────────────────────────────────────────────────────────
  // Sends a DELETE request to remove the announcement from the database entirely.
  // The banner will stop appearing on the site immediately after this succeeds.
  const clear = async () => {
    // `confirm()` opens a browser dialog to prevent accidental clears.
    // If the admin clicks "Cancel" the function returns early — nothing happens.
    if (!confirm('Remove the current announcement?')) return;

    setSaving(true);
    setStatus('');

    // DELETE carries no body — the server knows which record to remove because
    // there is only ever one site-wide announcement at a time.
    const res = await fetch('/api/admin/announcement', { method: 'DELETE' });

    setSaving(false);

    if (res.ok) {
      setMessage(''); // empty the textarea so the live preview disappears
      setStatus('cleared');
      router.refresh(); // re-sync the server component (banner is now gone)
    } else {
      setStatus('error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Announcement Banner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set a site-wide message that appears at the top of every page. Leave blank and clear to
          hide it.
        </p>
      </div>

      {/* ── Live preview ────────────────────────────────────────────────────
          Conditionally rendered — only shown when `message` has non-whitespace
          content. This gives the admin an accurate preview of how the banner
          will look before they click Save.
          The `trim()` check prevents the preview from flashing in for a single
          accidental space keystroke. */}
      {message.trim() && (
        <div className="mb-6 rounded-xl overflow-hidden border border-gray-700">
          {/* "Preview" label above the mock banner */}
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-4 py-2 border-b border-gray-800">
            Preview
          </p>
          {/* Styled to look identical to the real site banner */}
          <div className="bg-red-700 text-white text-sm px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex-1 text-center font-medium">{message}</div>
            {/* Decorative dismiss icon — not functional here, just visual context */}
            <span className="text-xs opacity-60">[×]</span>
          </div>
        </div>
      )}

      {/* ── Form card ───────────────────────────────────────────────────────
          `space-y-4` adds vertical gap between the textarea, status line,
          and button row without needing margin on individual elements. */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        {/* Controlled textarea — every keystroke updates `message` state,
            which immediately updates the live preview above */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Site maintenance scheduled for Sunday 2am–4am UTC."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* ── Status feedback ─────────────────────────────────────────────
            Exactly one of these three lines is shown at a time, depending on
            the `status` string set by save() or clear(). All three are
            hidden when status is '' (initial state or after a reset). */}
        {status === 'saved' && <p className="text-xs text-red-400">Announcement updated.</p>}
        {status === 'cleared' && <p className="text-xs text-gray-400">Announcement cleared.</p>}
        {status === 'error' && (
          <p className="text-xs text-red-400">Something went wrong. Try again.</p>
        )}

        {/* ── Button row ──────────────────────────────────────────────────
            "Clear banner" only appears if there is already a saved announcement
            (`current` is truthy). There is no point offering to clear something
            that doesn't exist yet — it would just confuse the admin.
            Both buttons are disabled while `saving` is true (request in-flight).
            The Save button also stays disabled when the textarea is empty. */}
        <div className="flex gap-3">
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
            // `!message.trim()` keeps Save disabled when textarea is empty
            disabled={saving || !message.trim()}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {/* Label changes while the request is in-flight so the admin
                knows the click registered and something is happening */}
            {saving ? 'Saving…' : 'Save announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}
