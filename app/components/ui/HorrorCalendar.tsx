'use client';
// app/components/ui/HorrorCalendar.tsx
// Sidebar widget showing upcoming horror dates + admin-created custom events.
// Static dates recur yearly; custom events come from /api/calendar-events.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Axe, Repeat, Drama, Flame, FlameKindling, Wheat, Leaf, Ghost, Skull, Moon, Trophy, type LucideIcon } from 'lucide-react';
import { eventIcon } from '@/lib/calendarIcons';

type HorrorDate = {
  month: number; day: number; label: string; icon: LucideIcon;
};

type CalendarEvent = {
  id: number; date: string; title: string; icon: string;
  note: string | null; linkUrl: string | null;
};

type UpcomingItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  note: string | null;
  linkUrl: string | null;
  days: number;
  displayDate: string;
  isCustom: boolean;
};

const HORROR_DATES: HorrorDate[] = [
  { month: 1,  day: 13, label: 'Friday the 13th',              icon: Axe },
  { month: 2,  day: 2,  label: 'Groundhog Day',                icon: Repeat },
  { month: 3,  day: 13, label: 'Friday the 13th',              icon: Axe },
  { month: 4,  day: 1,  label: 'All Fools Day',                icon: Drama },
  { month: 5,  day: 1,  label: "Walpurgis Night",              icon: Flame },
  { month: 6,  day: 6,  label: "The Omen Day (6/6)",           icon: FlameKindling },
  { month: 7,  day: 13, label: 'Friday the 13th',              icon: Axe },
  { month: 8,  day: 1,  label: 'Lammas — Harvest Dread',      icon: Wheat },
  { month: 9,  day: 22, label: 'Autumnal Equinox',             icon: Leaf },
  { month: 10, day: 13, label: 'Friday the 13th',              icon: Axe },
  { month: 10, day: 31, label: 'Halloween',                    icon: Ghost },
  { month: 11, day: 1,  label: "All Saints' Day",              icon: Skull },
  { month: 12, day: 13, label: 'Friday the 13th',              icon: Axe },
  { month: 12, day: 21, label: 'Winter Solstice — Dark Night', icon: Moon },
  { month: 12, day: 31, label: 'Year-End Horror Awards',       icon: Trophy },
];

function daysUntil(target: Date, now: Date): number {
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function shortDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HorrorCalendar() {
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    fetch('/api/calendar-events')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCustomEvents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const year = now.getFullYear();

    const staticItems: UpcomingItem[] = HORROR_DATES.map((d, i) => {
      let target = new Date(year, d.month - 1, d.day);
      if (target < now) target = new Date(year + 1, d.month - 1, d.day);
      return {
        key: `static-${i}`,
        icon: d.icon,
        label: d.label,
        note: null,
        linkUrl: null,
        days: daysUntil(target, now),
        displayDate: shortDate(target),
        isCustom: false,
      };
    });

    const customItems: UpcomingItem[] = customEvents.map(e => {
      const target = new Date(e.date);
      target.setHours(0, 0, 0, 0);
      return {
        key: `custom-${e.id}`,
        icon: eventIcon(e.icon),
        label: e.title,
        note: e.note,
        linkUrl: e.linkUrl,
        days: daysUntil(target, now),
        displayDate: shortDate(target),
        isCustom: true,
      };
    });

    return [...staticItems, ...customItems]
      .filter(item => item.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [customEvents]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Horror Calendar</h2>
      </div>

      <ul className="space-y-3">
        {upcoming.map((event) => {
          const content = (
            <>
              <event.icon className="w-5 h-5 shrink-0 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${event.isCustom ? 'text-purple-300' : 'text-white'}`}>
                  {event.label}
                </p>
                <p className="text-xs text-gray-500">
                  {event.displayDate}
                  {event.note && <span className="text-gray-600"> · {event.note}</span>}
                </p>
              </div>
              <div className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                event.days === 0
                  ? 'bg-green-600 text-white'
                  : event.days <= 7
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : event.isCustom
                      ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
                      : 'bg-gray-800 text-gray-500'
              }`}>
                {event.days === 0 ? 'Today!' : `${event.days}d`}
              </div>
            </>
          );

          return (
            <li key={event.key}>
              {event.linkUrl ? (
                <Link href={event.linkUrl} className="flex items-center gap-3 hover:opacity-80 transition">
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
