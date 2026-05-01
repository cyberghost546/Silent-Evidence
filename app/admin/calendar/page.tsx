'use client';
// =============================================================================
// app/admin/calendar/page.tsx — Content Calendar (Client Component)
// =============================================================================
//
// PURPOSE:
//   Displays a monthly calendar grid with two types of content overlaid on each
//   day cell:
//     1. Scheduled stories — pulled from the API, shown in red.
//     2. Custom homepage events — admin-created events shown in purple that also
//        appear on the public-facing "Horror Calendar" widget.
//   Clicking any day opens a modal to create or edit a custom calendar event.
//
// ACCESS CONTROL:
//   Protected by the /admin layout. This is a Client Component ('use client')
//   so it cannot perform server-side auth checks — the layout handles that.
//
// DATA SOURCES (client-side fetch, not Prisma directly):
//   - GET /api/admin/calendar        → scheduled stories for the current year.
//   - GET /api/admin/calendar/events → custom CalendarEvent rows.
//   Mutations use PATCH/POST/DELETE on /api/admin/calendar/events/:id.
//
// KEY PATTERNS:
//   - Client Component with useState + useEffect for async data loading.
//   - Promise.all inside useEffect to fetch both endpoints in parallel.
//   - Optimistic local state update after save/delete (no page reload needed).
//   - Calendar grid built by a pure helper function (buildCalendar).
//   - Modal managed entirely with local React state.
// =============================================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';

// TypeScript types for the two data shapes returned by the APIs.
// Keeping types local (not in a shared types file) is fine for page-specific shapes.
type ScheduledStory = {
  id: number;
  title: string;
  slug: string;
  scheduledAt: string;       // ISO date string from the API
  author: { username: string };
  category: { name: string };
};

type CalendarEvent = {
  id: number;
  date: string;              // ISO date string (YYYY-MM-DD)
  title: string;
  icon: string;              // Emoji character chosen from ICON_OPTIONS
  note: string | null;       // Optional hover description
  linkUrl: string | null;    // Optional internal link (e.g. /story/slug)
};

// Short weekday headers for the calendar column labels.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Full month names indexed 0–11, matching JavaScript's Date.getMonth() return values.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Curated horror-themed emoji palette for calendar event icons.
const ICON_OPTIONS = ['📅','🎃','💀','🕯️','👻','🔪','🩸','🦇','🕷️','🌕','⚰️','🎭','📖','🌑','🔮'];

// ── Pure helper: buildCalendar ────────────────────────────────────────────────
// Returns an array of 35 or 42 cells (always a multiple of 7, for full weeks).
// Cells before the 1st of the month are `null` (empty leading cells).
// Cells from the 1st onward are the day number (1, 2, 3, …).
// Trailing null cells pad the last row to a complete week.
function buildCalendar(year: number, month: number): (number | null)[] {
  // getDay() returns 0 (Sun) – 6 (Sat) for the first day's weekday position.
  const firstDay = new Date(year, month, 1).getDay();
  // Setting day=0 of month+1 gives the last day of `month` — clever JS Date trick.
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];

  // Push `firstDay` null values to offset the grid to the correct weekday column.
  for (let i = 0; i < firstDay; i++) cells.push(null);
  // Push actual day numbers.
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad trailing nulls so the total length is divisible by 7.
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

// ── Pure helper: toDateKey ────────────────────────────────────────────────────
// Converts (year, 0-indexed month, day) to a zero-padded "YYYY-MM-DD" string,
// which is used as the Map key for O(1) lookup when rendering each day cell.
function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminCalendarPage() {
  const now = new Date();

  // ── State ─────────────────────────────────────────────────────────────────
  // year/month control which month is displayed — independent of today's date
  // once the user navigates forward/backward.
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Data loaded from the two API endpoints.
  const [stories, setStories]  = useState<ScheduledStory[]>([]);
  const [events, setEvents]    = useState<CalendarEvent[]>([]);
  const [loading, setLoading]  = useState(true);

  // Modal state — `selected` being non-null means the modal is open.
  const [selected, setSelected] = useState<{
    date: string;           // The clicked day's YYYY-MM-DD key
    existing: CalendarEvent | null; // null = creating new; non-null = editing
  } | null>(null);

  // Controlled form fields inside the modal.
  const [formTitle, setFormTitle] = useState('');
  const [formIcon, setFormIcon]   = useState('📅');
  const [formNote, setFormNote]   = useState('');
  const [formLink, setFormLink]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');  // Inline error message

  // ── Data fetch on mount ───────────────────────────────────────────────────
  // We only need to fetch once when the component mounts; the calendar shows all
  // scheduled stories for the year regardless of which month is displayed.
  useEffect(() => {
    // Promise.all fetches both endpoints simultaneously, cutting total load time
    // to max(storiesLatency, eventsLatency) rather than their sum.
    Promise.all([
      fetch('/api/admin/calendar').then(r => r.json()),
      fetch('/api/admin/calendar/events').then(r => r.json()),
    ]).then(([storiesData, eventsData]) => {
      // Guard against the API returning an error object instead of an array.
      setStories(storiesData.stories ?? []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    }).finally(() => setLoading(false)); // Always clear the loading spinner
  }, []); // Empty dep array → runs once after first render, not on re-renders

  // ── Month navigation helpers ──────────────────────────────────────────────
  // When decrementing past January (month 0), we roll back to December and
  // decrement the year. Vice-versa for nextMonth.
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build the flat array of cells for the current month/year.
  const cells = buildCalendar(year, month);

  // ── Index data into Maps for O(1) per-cell lookup ─────────────────────────
  // Instead of filtering the full arrays on every cell render (O(n) × 42 cells),
  // we build Maps once upfront. Each key is a YYYY-MM-DD string.
  const storiesByDay = new Map<string, ScheduledStory[]>();
  for (const s of stories) {
    const d = new Date(s.scheduledAt);
    const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    storiesByDay.set(key, [...(storiesByDay.get(key) ?? []), s]);
  }

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const d = new Date(e.date);
    const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
  }

  // ── Modal open/close ──────────────────────────────────────────────────────
  const openModal = (day: number) => {
    const dateKey = toDateKey(year, month, day);
    // If there's already an event on this day, pre-fill the form for editing.
    // We only grab the first event (index 0) — one custom event per day is
    // the intended UX; multiple events can stack but only the first is editable here.
    const existing = eventsByDay.get(dateKey)?.[0] ?? null;
    setSelected({ date: dateKey, existing });
    setFormTitle(existing?.title ?? '');
    setFormIcon(existing?.icon ?? '📅');
    setFormNote(existing?.note ?? '');
    setFormLink(existing?.linkUrl ?? '');
    setMsg('');
  };

  const closeModal = () => { setSelected(null); setMsg(''); };

  // ── Save event (create or update) ─────────────────────────────────────────
  const saveEvent = async () => {
    if (!formTitle.trim()) { setMsg('Title is required.'); return; }

    setSaving(true);
    setMsg('');

    // Determine whether this is an edit (PATCH) or a create (POST).
    // `!!selected?.existing` coerces the existing event to a boolean.
    const isEdit = !!selected?.existing;
    const url = isEdit
      ? `/api/admin/calendar/events/${selected!.existing!.id}`
      : '/api/admin/calendar/events';

    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selected!.date,
        title: formTitle,
        icon: formIcon,
        note: formNote,
        linkUrl: formLink,
      }),
    });

    setSaving(false);

    if (!res.ok) { setMsg('Failed to save.'); return; }

    // Parse the saved event returned by the API (includes the DB-assigned id).
    const saved: CalendarEvent = await res.json();

    // Optimistic update: replace any existing event with the same id, or append
    // if it's new. This avoids a full refetch and keeps the UI in sync instantly.
    setEvents(prev => {
      const filtered = prev.filter(e => e.id !== saved.id);
      return [...filtered, saved];
    });

    closeModal();
  };

  // ── Delete event ──────────────────────────────────────────────────────────
  const deleteEvent = async () => {
    if (!selected?.existing) return;
    // Native browser confirm() is acceptable in admin tools where UX polish
    // is secondary to simplicity. Production apps might use a custom dialog.
    if (!confirm('Delete this event?')) return;

    setSaving(true);
    await fetch(`/api/admin/calendar/events/${selected.existing.id}`, { method: 'DELETE' });

    // Remove the deleted event from local state immediately.
    setEvents(prev => prev.filter(e => e.id !== selected.existing!.id));
    setSaving(false);
    closeModal();
  };

  // Snapshot today's date for highlighting the current day in the grid.
  const today      = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear  = now.getFullYear();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Content Calendar</h1>
      <p className="text-gray-500 text-sm mb-6">
        Click any day to add a custom event — it will appear on the homepage Horror Calendar widget.
      </p>

      {/* ── Month navigation ── */}
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={prevMonth}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition">
          ← Prev
        </button>
        {/* `min-w-[160px] text-center` prevents the heading from jumping width
            as the month name length changes (January vs May, etc.). */}
        <h2 className="text-lg font-bold text-white min-w-[160px] text-center">
          {MONTHS[month]} {year}
        </h2>
        <button type="button" onClick={nextMonth}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition">
          Next →
        </button>
        {/* "Today" button jumps directly back to the current month/year */}
        <button type="button"
          onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}
          className="ml-auto text-xs text-gray-500 hover:text-white transition border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg">
          Today
        </button>
      </div>

      {/* ── Calendar or loading state ── */}
      {loading ? (
        // `animate-pulse` creates a subtle fade-in/out to signal loading activity.
        <div className="text-center py-20 text-gray-500 animate-pulse">Loading…</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Day-of-week column headers */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {DAYS.map(d => (
              <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar day cells — 7 columns matching the header */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              // Is this the real today (used for the red date circle)?
              const isToday = day === today && month === todayMonth && year === todayYear;
              // Compute the YYYY-MM-DD key for this cell (null for empty leading/trailing cells).
              const dateKey = day ? toDateKey(year, month, day) : null;
              // Look up pre-indexed data for this day.
              const dayStories = dateKey ? (storiesByDay.get(dateKey) ?? []) : [];
              const dayEvents  = dateKey ? (eventsByDay.get(dateKey) ?? []) : [];

              return (
                <div
                  key={i}
                  onClick={() => day && openModal(day)} // Null cells are not clickable
                  className={`min-h-[90px] p-2 border-b border-r border-gray-800/60 transition
                    ${day ? 'cursor-pointer hover:bg-gray-800/40' : 'bg-gray-950/30'}
                    ${i % 7 === 6 ? 'border-r-0' : ''}`} // Remove right border on last column
                >
                  {/* Only render content for real day cells (not null padding) */}
                  {day && (
                    <>
                      {/* Day number — red filled circle when today, plain text otherwise */}
                      <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold mb-1 ${
                        isToday ? 'bg-red-600 text-white' : 'text-gray-500'
                      }`}>
                        {day}
                      </span>

                      <div className="space-y-1">
                        {/* Custom homepage calendar events (purple) */}
                        {dayEvents.map(e => (
                          <div key={e.id}
                            className="flex items-center gap-1 text-[10px] leading-tight px-1.5 py-0.5 rounded bg-purple-600/20 border border-purple-600/30 text-purple-300 truncate">
                            <span>{e.icon}</span>
                            <span className="truncate">{e.title}</span>
                          </div>
                        ))}

                        {/* Scheduled stories (red) — clicking navigates to /admin/stories,
                            e.stopPropagation() prevents the day-cell click from also
                            opening the event-creation modal simultaneously. */}
                        {dayStories.map(s => (
                          <Link key={s.id} href="/admin/stories" title={s.title}
                            onClick={e => e.stopPropagation()}
                            className="block text-[10px] leading-tight px-1.5 py-0.5 rounded bg-red-600/20 border border-red-600/30 text-red-300 hover:bg-red-600/30 transition truncate">
                            {s.title}
                          </Link>
                        ))}

                        {/* Prompt to add an event when the day is empty */}
                        {dayEvents.length === 0 && dayStories.length === 0 && (
                          <div className="text-[9px] text-gray-700 mt-1">+ add event</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-purple-600/30 border border-purple-600/40" />
          Homepage calendar event
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-red-600/30 border border-red-600/40" />
          Scheduled story
        </div>
        {/* `ml-auto` pushes the count to the far right on wide screens */}
        <span className="ml-auto">
          {events.length} custom events · {stories.length} scheduled stories
        </span>
      </div>

      {/* ── Day Edit / Create Modal ── */}
      {/*
        `selected` being non-null acts as the open/close flag.
        The outer div is the dark overlay; clicking it closes the modal.
        `e.stopPropagation()` on the inner div prevents clicks inside the card
        from bubbling up and triggering the overlay's onClick handler.
      */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {/* Conditional label: "Edit Event" vs "Add Event" */}
                  {selected.existing ? 'Edit Event' : 'Add Event'}
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  {selected.date} · shows on homepage calendar
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              {/* ── Icon picker ── */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(ic => (
                    // Highlight the selected icon with a purple border/background
                    <button key={ic} type="button" onClick={() => setFormIcon(ic)}
                      className={`w-9 h-9 text-xl rounded-lg border transition ${
                        formIcon === ic
                          ? 'border-purple-500 bg-purple-900/40'
                          : 'border-gray-700 hover:border-gray-500'
                      }`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Title (required) ── */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Event Title <span className="text-red-400">*</span>
                </label>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Halloween Reading Marathon"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* ── Note (optional) ── */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Note <span className="text-gray-600">(optional)</span>
                </label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="Short description shown on hover"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* ── Link URL (optional) ── */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Link URL <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  value={formLink}
                  onChange={e => setFormLink(e.target.value)}
                  placeholder="e.g. /story/halloween-special"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Inline error message (only visible when msg is non-empty) */}
              {msg && <p className="text-red-400 text-xs">{msg}</p>}

              {/* ── Action buttons ── */}
              <div className="flex gap-3 pt-1">
                {/* Primary save/create button — disabled while the request is in-flight */}
                <button onClick={saveEvent} disabled={saving}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                  {saving ? 'Saving…' : selected.existing ? 'Save Changes' : 'Add to Calendar'}
                </button>

                {/* Delete button — only shown when editing an existing event */}
                {selected.existing && (
                  <button onClick={deleteEvent} disabled={saving}
                    className="px-4 py-2.5 bg-red-900/40 hover:bg-red-900/60 text-red-400 text-sm rounded-xl transition border border-red-800/40">
                    Delete
                  </button>
                )}

                <button onClick={closeModal} className="px-4 py-2.5 text-gray-400 hover:text-white text-sm transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
