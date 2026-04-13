'use client';
/**
 * app/admin/contact/ContactInbox.tsx
 * ────────────────────────────────────
 * PURPOSE:
 *   A two-panel email-client-style inbox for reading contact form submissions.
 *   The left panel shows a scrollable list of messages with filter tabs.
 *   The right panel shows the full content of whichever message is selected.
 *
 * HOW IT WORKS:
 *   1. The parent server page pre-fetches all contact messages and passes them
 *      as `initialMessages`.
 *   2. Clicking a message in the left panel selects it and, if it was unread,
 *      automatically PATCHes the API to mark it as read.
 *   3. The admin can "Mark resolved" (PATCH) or "Delete" (DELETE) from the right
 *      panel.  Both operations update local state immediately so the UI reflects
 *      the change without a page reload.
 *   4. Three filter tabs ("all", "unread", "resolved") narrow the left panel list.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - This two-panel layout (list + detail) works for any inbox-style admin UI:
 *     support tickets, bug reports, newsletter replies, etc.
 *   - The `patch` helper is a reusable pattern for toggling boolean fields on
 *     a record via a REST API without full page reloads.
 *   - The `open` function shows how to combine "select item" + "side-effect API
 *     call" in a single handler.
 */

import { useState } from 'react';
import { Mail, Check } from 'lucide-react';

// ── Type definitions ──────────────────────────────────────────────────────────

// Shape of a single contact form submission
type Message = {
  id: number;
  name: string;       // sender's name
  email: string;      // sender's email address (used to construct mailto: reply link)
  subject: string;    // subject line shown in the list
  message: string;    // full message body shown in the detail panel
  read: boolean;      // true once the admin has opened the message
  resolved: boolean;  // true once the admin marks it as handled
  createdAt: string;  // ISO date string — when the form was submitted
};

// The three tab options for filtering the left panel
type Filter = 'all' | 'unread' | 'resolved';

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContactInbox({ initialMessages }: { initialMessages: Message[] }) {
  // Local copy of all messages — updated by patch/remove so the UI stays in sync
  const [messages, setMessages] = useState(initialMessages);

  // Active filter tab — controls which messages appear in the left panel list
  const [filter, setFilter]     = useState<Filter>('all');

  // The message currently shown in the right panel.
  // null = no selection, show the empty-state placeholder.
  const [selected, setSelected] = useState<Message | null>(null);

  // True while any API call is in flight — disables action buttons to prevent
  // duplicate requests (e.g. double-clicking "Delete")
  const [loading, setLoading]   = useState(false);

  // ── Derived values ────────────────────────────────────────────────────────

  // Compute the visible list each render based on the active filter tab.
  // This runs on the client instantly — no API call needed.
  const visible = messages.filter(m =>
    filter === 'unread'   ? !m.read :      // only messages the admin hasn't opened yet
    filter === 'resolved' ? m.resolved :   // only messages the admin has resolved
    true                                   // 'all' — show everything
  );

  // Badge count on the "unread" tab so the admin can see at a glance
  const unreadCount = messages.filter(m => !m.read).length;

  // ── Patch a message field (read / resolved) ──────────────────────────────
  // Generic helper for PATCH operations.
  // `data` is a partial object — only the fields we want to change are sent.
  // TypeScript's `Pick` ensures we can only pass `read` or `resolved`, not anything else.
  const patch = async (id: number, data: Partial<Pick<Message, 'read' | 'resolved'>>) => {
    setLoading(true);
    const res = await fetch(`/api/contact/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) return; // silently ignore errors — could add a toast here

    // The API returns the updated message object — merge it into local state
    const updated: Message = await res.json();
    // Replace only the updated message, keeping all others unchanged
    setMessages(prev => prev.map(m => m.id === id ? updated : m));
    // If this message is currently open in the right panel, update it there too
    if (selected?.id === id) setSelected(updated);
  };

  // ── Open a message and auto-mark it read ─────────────────────────────────
  // Called when the admin clicks a row in the left panel.
  // Selecting an unread message automatically marks it as read via PATCH.
  const open = (msg: Message) => {
    setSelected(msg);                           // show in the right panel immediately
    if (!msg.read) patch(msg.id, { read: true }); // fire-and-forget the read mark
  };

  // ── Delete a message ──────────────────────────────────────────────────────
  // Permanently removes the message from the database.
  // Shows a browser confirm dialog first to prevent accidental deletion.
  const remove = async (id: number) => {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    setLoading(true);
    const res = await fetch(`/api/contact/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (!res.ok) return;
    // Remove the deleted message from local state so the row disappears
    setMessages(prev => prev.filter(m => m.id !== id));
    // If the deleted message was open, clear the right panel
    if (selected?.id === id) setSelected(null);
  };

  return (
    // h-full fills the flex-1 wrapper in page.tsx — no fragile calc needed
    <div className="flex gap-6 h-full">

      {/* ── Left panel: message list ── */}
      <div className="w-full max-w-sm flex flex-col flex-shrink-0">

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-4">
          {(['all', 'unread', 'resolved'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                filter === f
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1 bg-white/20 px-1.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {visible.length === 0 && (
            <p className="text-center text-sm text-gray-600 py-12">No messages.</p>
          )}
          {visible.map(msg => (
            <button
              key={msg.id}
              onClick={() => open(msg)}
              className={`w-full text-left p-4 rounded-xl border transition ${
                selected?.id === msg.id
                  ? 'bg-gray-800 border-red-600/50'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Unread dot */}
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  msg.read ? 'bg-gray-700' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${msg.read ? 'text-gray-400' : 'text-white'}`}>
                      {msg.name}
                    </p>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{msg.subject}</p>
                  <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{msg.message}</p>
                </div>
              </div>
              {msg.resolved && (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" /> Resolved
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right panel: message reader ── */}
      <div className="flex-1 min-w-0 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-400 font-medium">Select a message to read it</p>
            <p className="text-xs text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-800 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.subject}</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  From <span className="text-white font-medium">{selected.name}</span>
                  {' '}·{' '}
                  <a href={`mailto:${selected.email}`} className="text-red-400 hover:text-red-300 transition">
                    {selected.email}
                  </a>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(selected.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium', timeStyle: 'short',
                  })}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Reply by email */}
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                >
                  Reply by email
                </a>

                {/* Resolve / unresolve */}
                <button
                  onClick={() => patch(selected.id, { resolved: !selected.resolved })}
                  disabled={loading}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition disabled:opacity-50 ${
                    selected.resolved
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {selected.resolved ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Resolved</span> : 'Mark resolved'}
                </button>

                {/* Delete */}
                <button
                  onClick={() => remove(selected.id)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 hover:border-red-600/50 hover:text-red-400 text-gray-500 rounded-lg transition disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Message body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
