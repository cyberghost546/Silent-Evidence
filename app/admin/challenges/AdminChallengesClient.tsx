'use client';
// app/admin/challenges/AdminChallengesClient.tsx
// Admin panel for managing writing challenges.
//
// A "challenge" is a timed writing competition. Authors submit stories that
// belong to the challenge, and the community can vote on them.
//
// This component lets admins:
//   - See all challenges in a table with live status badges
//   - Edit a challenge's title, description, prompt, dates, and active flag
//   - Reset (wipe) all entries so the challenge can run again fresh
//   - Delete a challenge entirely
//   - Navigate to create a new challenge via /admin/challenges/new
//
// The component is client-side ('use client') because it manages local state
// and makes real-time API calls without a full page reload.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, RefreshCw } from 'lucide-react';

// ── Type definitions ──────────────────────────────────────────────────────────

// Shape of a single challenge as passed down from the server page
type Challenge = {
  id: number;
  title: string;
  description: string;
  prompt: string; // The creative prompt writers must respond to
  startDate: string; // ISO string — when the challenge opens
  endDate: string; // ISO string — when the challenge closes
  active: boolean; // If false, the challenge is hidden from users
  entries: number; // How many story submissions have been made
};

// ── Helper ────────────────────────────────────────────────────────────────────

// Converts a full ISO date string (e.g. "2024-11-01T09:00:00.000Z") to the
// shorter "YYYY-MM-DDTHH:MM" format that <input type="datetime-local"> expects.
// We only take the first 16 characters to drop the seconds and timezone.
function toDatetimeLocal(iso: string) {
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminChallengesClient({
  challenges: initial,
}: {
  challenges: Challenge[];
}) {
  // useRouter lets us call router.refresh() after a save to re-run the
  // server component and sync the table with the latest database values.
  const router = useRouter();

  // Local copy of challenges. We update this directly after API calls so the
  // table reflects changes without waiting for a full page reload.
  const [challenges, setChallenges] = useState(initial);

  // The challenge currently open in the edit modal, or null when closed.
  // We copy the challenge object so edits don't mutate the list before saving.
  const [editing, setEditing] = useState<Challenge | null>(null);

  // Loading flags — disable buttons while async operations are in progress
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Error string shown inside the modal when an API call fails
  const [error, setError] = useState('');

  // Capture the current time once so status calculations are consistent
  // across all rows in the table render pass.
  const now = new Date();

  // ── Modal open/close ───────────────────────────────────────────────────────

  // Open the edit modal with a shallow copy of the challenge.
  // Using a copy means the user can type in the form without changing
  // the main list until they click "Save".
  const openEdit = (c: Challenge) => {
    setEditing({ ...c });
    setError('');
  };

  // Close the modal and clear any error state
  const closeEdit = () => {
    setEditing(null);
    setError('');
  };

  // ── Save edits ─────────────────────────────────────────────────────────────

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      // PATCH /api/admin/challenges/[id] — send only the editable fields
      const res = await fetch(`/api/admin/challenges/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editing.title,
          description: editing.description,
          prompt: editing.prompt,
          // Convert the local datetime string back to a proper ISO string.
          // new Date("2024-11-01T09:00").toISOString() adds the timezone info
          // the server expects.
          startDate: new Date(editing.startDate).toISOString(),
          endDate: new Date(editing.endDate).toISOString(),
          active: editing.active,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Save failed.');
      } else {
        // Replace the old challenge in the local list with the updated values
        setChallenges((prev) => prev.map((c) => (c.id === editing.id ? { ...editing } : c)));
        closeEdit();
        // Refresh the server component so server-side data (e.g. entry counts) is up-to-date
        router.refresh();
      }
    } catch {
      setError('Network error.');
    }
    setSaving(false);
  };

  // ── Reset entries ──────────────────────────────────────────────────────────

  // Wipe all entries for a challenge so it can run fresh.
  // Uses POST with { action: 'reset' } rather than DELETE because DELETE
  // is reserved for deleting the challenge itself.
  const resetChallenge = async () => {
    if (!editing) return;
    // Ask the admin to confirm before destroying data — this cannot be undone
    if (!confirm(`Delete ALL entries for "${editing.title}"? This cannot be undone.`)) return;
    setResetting(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/challenges/${editing.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Reset failed.');
      } else {
        // Update local entry count to 0 so the badge reflects the reset immediately
        setChallenges((prev) => prev.map((c) => (c.id === editing.id ? { ...c, entries: 0 } : c)));
        setEditing((prev) => (prev ? { ...prev, entries: 0 } : prev));
      }
    } catch {
      setError('Network error.');
    }
    setResetting(false);
  };

  // ── Delete challenge ───────────────────────────────────────────────────────

  const deleteChallenge = async (id: number) => {
    // Browser confirm dialog prevents accidental deletes
    if (!confirm('Delete this challenge and all its entries?')) return;
    await fetch(`/api/admin/challenges/${id}`, { method: 'DELETE' });
    // Remove the deleted challenge from local state so the row disappears immediately
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  };

  // ── Status badge ───────────────────────────────────────────────────────────

  // Returns a human-readable status label and a Tailwind colour class for the badge.
  // Priority: Inactive > Ended > Active > Upcoming
  const getStatus = (c: Challenge) => {
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    if (!c.active) return { label: 'Inactive', color: 'text-gray-500' };
    if (now > end) return { label: 'Ended', color: 'text-gray-500' };
    if (now >= start) return { label: 'Active', color: 'text-red-400' };
    // Challenge exists but hasn't started yet
    return { label: 'Upcoming', color: 'text-yellow-400' };
  };

  return (
    <div>
      {/* ── Page header + "New Challenge" button ────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Challenges</h1>
          {/* Show total count as a quick summary */}
          <p className="text-sm text-gray-500 mt-1">{challenges.length} total</p>
        </div>
        {/* Link to the dedicated "create new challenge" page */}
        <Link
          href="/admin/challenges/new"
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
        >
          + New Challenge
        </Link>
      </div>

      {/* ── Table or empty state ─────────────────────────────────────────────── */}
      {challenges.length === 0 ? (
        // Empty state — shown when no challenges have been created yet
        <div className="text-center py-24 text-gray-500">No challenges yet.</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            {/* Column headers */}
            <thead className="border-b border-gray-800">
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Start</th>
                <th className="text-left px-5 py-3">End</th>
                <th className="text-left px-5 py-3">Entries</th>
                {/* Empty header for the action buttons column */}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {challenges.map((c, i) => {
                // Calculate the live status for this challenge
                const { label, color } = getStatus(c);
                return (
                  // Add a bottom border between rows but not after the last one
                  <tr
                    key={c.id}
                    className={`${i < challenges.length - 1 ? 'border-b border-gray-800' : ''} hover:bg-gray-800/40`}
                  >
                    {/* Title — truncated if too long */}
                    <td className="px-5 py-4 font-medium text-white max-w-[200px] truncate">
                      {c.title}
                    </td>
                    {/* Status badge — colour comes from getStatus() */}
                    <td className={`px-5 py-4 font-semibold text-xs ${color}`}>{label}</td>
                    {/* Dates formatted with the browser's locale */}
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {new Date(c.startDate).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {new Date(c.endDate).toLocaleString()}
                    </td>
                    {/* Entry count */}
                    <td className="px-5 py-4 text-gray-300">{c.entries}</td>
                    {/* Row action buttons */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-3">
                        {/* Edit — opens the modal pre-filled with this challenge */}
                        <button
                          onClick={() => openEdit(c)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        {/* View — opens the public challenge page in a new tab */}
                        <Link
                          href={`/challenges/${c.id}`}
                          className="text-xs text-red-400 hover:text-red-300 transition"
                          target="_blank"
                        >
                          View →
                        </Link>
                        {/* Delete — removes the challenge and all its entries */}
                        <button
                          onClick={() => deleteChallenge(c.id)}
                          className="text-xs text-gray-600 hover:text-red-400 transition"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      {/* The modal is conditionally rendered — it only exists in the DOM when
          `editing` is non-null (i.e. the admin clicked "Edit" on a row).
          The backdrop is a fixed overlay that covers the entire viewport. */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Edit Challenge</h2>
              {/* × button to close without saving */}
              <button
                onClick={closeEdit}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Form fields */}
            <div className="p-6 space-y-4">
              {/* Title field — short name displayed in the challenge list and on the page */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input
                  value={editing.title}
                  // Spread the existing editing state and overwrite only `title`
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Description — paragraph shown below the title on the challenge page */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  // suppressHydrationWarning prevents React from warning about
                  // server/client text mismatch when dates are serialised differently
                  suppressHydrationWarning
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Prompt — the specific creative writing instruction for participants */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Prompt</label>
                <textarea
                  value={editing.prompt}
                  onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
                  rows={3}
                  suppressHydrationWarning
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Date pickers — two columns side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                  {/* toDatetimeLocal() strips the timezone so the input value is valid */}
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(editing.startDate)}
                    onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(editing.endDate)}
                    onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Active toggle — a custom pill-style toggle switch.
                  When active=true the pill is green and the white dot is on the right.
                  When active=false the pill is gray and the dot is on the left. */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditing({ ...editing, active: !editing.active })}
                  className={`relative w-10 h-5 rounded-full transition ${editing.active ? 'bg-red-500' : 'bg-gray-700'}`}
                >
                  {/* The sliding white dot — moves right when active */}
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${editing.active ? 'left-5' : 'left-0.5'}`}
                  />
                </button>
                <span className="text-sm text-gray-300">
                  {editing.active ? 'Active (visible to users)' : 'Inactive (hidden)'}
                </span>
              </div>

              {/* Inline error message shown when the API call fails */}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            {/* Reset entries button — destructive action, shown in orange as a warning */}
            <div className="px-6 pb-3">
              {/* Reset button — clears all entries so the challenge runs fresh.
                  Disabled when there are no entries (nothing to reset) or while resetting. */}
              <button
                onClick={resetChallenge}
                disabled={resetting || editing.entries === 0}
                className="w-full py-2 bg-gray-800 hover:bg-orange-900/50 border border-gray-700 hover:border-orange-600/50 disabled:opacity-40 text-orange-400 text-xs font-semibold rounded-xl transition"
              >
                {resetting ? (
                  'Resetting…'
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" /> Reset entries ({editing.entries} will be
                    deleted)
                  </span>
                )}
              </button>
            </div>

            {/* Footer buttons — Cancel and Save */}
            <div className="flex gap-3 px-6 pb-6">
              {/* Cancel — closes the modal without saving */}
              <button
                onClick={closeEdit}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition"
              >
                Cancel
              </button>
              {/* Save — disabled while the PATCH request is in flight */}
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
