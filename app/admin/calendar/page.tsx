'use client';
// app/admin/calendar/page.tsx
// Monthly calendar showing every scheduled story, with prev/next month navigation.

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ScheduledStory = {
  id: number;
  title: string;
  slug: string;
  scheduledAt: string;
  author: { username: string };
  category: { name: string };
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function AdminCalendarPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [stories, setStories] = useState<ScheduledStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/calendar')
      .then(r => r.json())
      .then(d => setStories(d.stories ?? []))
      .finally(() => setLoading(false));
  }, []);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells = buildCalendar(year, month);

  // Map "YYYY-MM-DD" → stories
  const byDay = new Map<string, ScheduledStory[]>();
  for (const s of stories) {
    const d = new Date(s.scheduledAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }

  const today = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear  = now.getFullYear();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Content Calendar</h1>
      <p className="text-gray-500 text-sm mb-6">Scheduled story publication dates</p>

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
              const key = day ? `${year}-${month}-${day}` : null;
              const dayStories = key ? (byDay.get(key) ?? []) : [];
              return (
                <div
                  key={i}
                  className={`min-h-[90px] p-2 border-b border-r border-gray-800/60 ${day ? '' : 'bg-gray-950/30'} ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold mb-1 ${isToday ? 'bg-red-600 text-white' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      <div className="space-y-1">
                        {dayStories.map(s => (
                          <Link
                            key={s.id}
                            href={`/admin/stories`}
                            title={s.title}
                            className="block text-[10px] leading-tight px-1.5 py-0.5 rounded bg-red-600/20 border border-red-600/30 text-red-300 hover:bg-red-600/30 transition truncate"
                          >
                            {s.title}
                          </Link>
                        ))}
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
      <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
        <span className="inline-block w-3 h-3 rounded bg-red-600/30 border border-red-600/40" />
        Scheduled story
        <span className="ml-4">{stories.length} total scheduled</span>
      </div>
    </div>
  );
}
