'use client';
// app/admin/calendar/page.tsx
// Monthly calendar showing scheduled stories AND custom calendar events.
// Click any day to add or edit a custom event that will appear on the homepage.

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ScheduledStory = {
  id: number; title: string; slug: string; scheduledAt: string;
  author: { username: string }; category: { name: string };
};

type CalendarEvent = {
  id: number; date: string; title: string; icon: string;
  note: string | null; linkUrl: string | null;
};

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ICON_OPTIONS = ['📅','🎃','💀','🕯️','👻','🔪','🩸','🦇','🕷️','🌕','⚰️','🎭','📖','🌑','🔮'];

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function AdminCalendarPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [stories, setStories]   = useState<ScheduledStory[]>([]);
  const [events, setEvents]     = useState<CalendarEvent[]>([]);
  const [loading, setLoading]   = useState(true);

  // Modal state
  const [selected, setSelected] = useState<{ date: string; existing: CalendarEvent | null } | null>(null);
  const [formTitle, setFormTitle]   = useState('');
  const [formIcon, setFormIcon]     = useState('📅');
  const [formNote, setFormNote]     = useState('');
  const [formLink, setFormLink]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/calendar').then(r => r.json()),
      fetch('/api/admin/calendar/events').then(r => r.json()),
    ]).then(([storiesData, eventsData]) => {
      setStories(storiesData.stories ?? []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    }).finally(() => setLoading(false));
  }, []);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells = buildCalendar(year, month);

  // Map "YYYY-MM-DD" → stories
  const storiesByDay = new Map<string, ScheduledStory[]>();
  for (const s of stories) {
    const d = new Date(s.scheduledAt);
    const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    storiesByDay.set(key, [...(storiesByDay.get(key) ?? []), s]);
  }

  // Map "YYYY-MM-DD" → calendar events
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const d = new Date(e.date);
    const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
  }

  const openModal = (day: number) => {
    const dateKey = toDateKey(year, month, day);
    const existing = eventsByDay.get(dateKey)?.[0] ?? null;
    setSelected({ date: dateKey, existing });
    setFormTitle(existing?.title ?? '');
    setFormIcon(existing?.icon ?? '📅');
    setFormNote(existing?.note ?? '');
    setFormLink(existing?.linkUrl ?? '');
    setMsg('');
  };

  const closeModal = () => { setSelected(null); setMsg(''); };

  const saveEvent = async () => {
    if (!formTitle.trim()) { setMsg('Title is required.'); return; }
    setSaving(true); setMsg('');
    const isEdit = !!selected?.existing;
    const url = isEdit
      ? `/api/admin/calendar/events/${selected!.existing!.id}`
      : '/api/admin/calendar/events';
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selected!.date, title: formTitle, icon: formIcon, note: formNote, linkUrl: formLink }),
    });
    setSaving(false);
    if (!res.ok) { setMsg('Failed to save.'); return; }
    const saved: CalendarEvent = await res.json();
    setEvents(prev => {
      const filtered = prev.filter(e => e.id !== saved.id);
      return [...filtered, saved];
    });
    closeModal();
  };

  const deleteEvent = async () => {
    if (!selected?.existing) return;
    if (!confirm('Delete this event?')) return;
    setSaving(true);
    await fetch(`/api/admin/calendar/events/${selected.existing.id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(e => e.id !== selected.existing!.id));
    setSaving(false);
    closeModal();
  };

  const today = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear  = now.getFullYear();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Content Calendar</h1>
      <p className="text-gray-500 text-sm mb-6">
        Click any day to add a custom event — it will appear on the homepage Horror Calendar widget.
      </p>

      {/* Month navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={prevMonth} className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition">← Prev</button>
        <h2 className="text-lg font-bold text-white min-w-[160px] text-center">{MONTHS[month]} {year}</h2>
        <button type="button" onClick={nextMonth} className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition">Next →</button>
        <button type="button" onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }} className="ml-auto text-xs text-gray-500 hover:text-white transition border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg">Today</button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">Loading…</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {DAYS.map(d => (
              <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const isToday = day === today && month === todayMonth && year === todayYear;
              const dateKey = day ? toDateKey(year, month, day) : null;
              const dayStories = dateKey ? (storiesByDay.get(dateKey) ?? []) : [];
              const dayEvents  = dateKey ? (eventsByDay.get(dateKey) ?? []) : [];
              return (
                <div
                  key={i}
                  onClick={() => day && openModal(day)}
                  className={`min-h-[90px] p-2 border-b border-r border-gray-800/60 transition
                    ${day ? 'cursor-pointer hover:bg-gray-800/40' : 'bg-gray-950/30'}
                    ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold mb-1 ${isToday ? 'bg-red-600 text-white' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      <div className="space-y-1">
                        {/* Custom calendar events */}
                        {dayEvents.map(e => (
                          <div key={e.id} className="flex items-center gap-1 text-[10px] leading-tight px-1.5 py-0.5 rounded bg-purple-600/20 border border-purple-600/30 text-purple-300 truncate">
                            <span>{e.icon}</span>
                            <span className="truncate">{e.title}</span>
                          </div>
                        ))}
                        {/* Scheduled stories */}
                        {dayStories.map(s => (
                          <Link key={s.id} href="/admin/stories" title={s.title}
                            onClick={e => e.stopPropagation()}
                            className="block text-[10px] leading-tight px-1.5 py-0.5 rounded bg-red-600/20 border border-red-600/30 text-red-300 hover:bg-red-600/30 transition truncate">
                            {s.title}
                          </Link>
                        ))}
                        {/* Add indicator */}
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-purple-600/30 border border-purple-600/40" />
          Homepage calendar event
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-red-600/30 border border-red-600/40" />
          Scheduled story
        </div>
        <span className="ml-auto">{events.length} custom events · {stories.length} scheduled stories</span>
      </div>

      {/* ── Day Edit Modal ─────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={closeModal}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {selected.existing ? 'Edit Event' : 'Add Event'}
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">{selected.date} · shows on homepage calendar</p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              {/* Icon picker */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setFormIcon(ic)}
                      className={`w-9 h-9 text-xl rounded-lg border transition ${formIcon === ic ? 'border-purple-500 bg-purple-900/40' : 'border-gray-700 hover:border-gray-500'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Event Title <span className="text-red-400">*</span></label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} maxLength={80}
                  placeholder="e.g. Halloween Reading Marathon"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Note <span className="text-gray-600">(optional)</span></label>
                <textarea value={formNote} onChange={e => setFormNote(e.target.value)} rows={2} maxLength={200}
                  placeholder="Short description shown on hover"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
              </div>

              {/* Link */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Link URL <span className="text-gray-600">(optional)</span></label>
                <input value={formLink} onChange={e => setFormLink(e.target.value)}
                  placeholder="e.g. /story/halloween-special"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>

              {msg && <p className="text-red-400 text-xs">{msg}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={saveEvent} disabled={saving}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                  {saving ? 'Saving…' : selected.existing ? 'Save Changes' : 'Add to Calendar'}
                </button>
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
