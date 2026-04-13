'use client';
// app/components/ui/HorrorCalendar.tsx
// A compact calendar sidebar widget showing upcoming horror-relevant dates.
// Dates are static (well-known horror events & occasions) so no DB needed.
// Displays next 5 upcoming events from today.

import { useMemo } from 'react';

// Type representing a single recurring horror date with its display info
type HorrorDate = {
  month: number; // 1-12 (January = 1)
  day: number;   // Day of month
  label: string; // Human-readable event name
  icon: string;  // Emoji icon for visual flair
};

// Well-known horror dates — recurring every year
const HORROR_DATES: HorrorDate[] = [
  { month: 1,  day: 13, label: 'Friday the 13th (Jan)',       icon: '🔪' }, // If Jan 13 falls on a Friday
  { month: 2,  day: 2,  label: 'Groundhog Day',               icon: '👁️' }, // Eerie time-loop origins
  { month: 3,  day: 13, label: 'Friday the 13th (Mar)',       icon: '🔪' }, // Unlucky day
  { month: 4,  day: 30, label: "Walpurgis Night",             icon: '🧙' }, // Ancient witch festival
  { month: 5,  day: 13, label: 'Friday the 13th (May)',       icon: '🔪' }, // Unlucky day
  { month: 6,  day: 6,  label: "Devil's Day (6/6)",           icon: '😈' }, // 6th day of 6th month
  { month: 7,  day: 13, label: 'Friday the 13th (Jul)',       icon: '🔪' }, // Unlucky day
  { month: 8,  day: 1,  label: 'Lammas / Lughnasadh',         icon: '🌾' }, // Harvest ritual
  { month: 9,  day: 13, label: 'Friday the 13th (Sep)',       icon: '🔪' }, // Unlucky day
  { month: 10, day: 13, label: 'Friday the 13th (Oct)',       icon: '🔪' }, // Spookiest month
  { month: 10, day: 30, label: 'Mischief Night',              icon: '🌑' }, // Night before Halloween
  { month: 10, day: 31, label: 'Halloween',                   icon: '🎃' }, // The big one
  { month: 11, day: 1,  label: 'Day of the Dead',             icon: '💀' }, // Día de los Muertos
  { month: 11, day: 2,  label: 'All Souls\' Day',             icon: '🕯️' }, // Honor the dead
  { month: 12, day: 21, label: 'Winter Solstice',             icon: '🌒' }, // Longest night of the year
];

// Calculate the number of days from `now` until the next occurrence of month/day.
// If the date already passed this year, it wraps to next year.
function daysUntil(month: number, day: number, now: Date): number {
  const thisYear = now.getFullYear();
  let target = new Date(thisYear, month - 1, day); // JS months are 0-indexed
  if (target < now) {
    // Already passed this year — schedule for next year
    target = new Date(thisYear + 1, month - 1, day);
  }
  const diff = target.getTime() - now.getTime(); // millisecond difference
  return Math.ceil(diff / (1000 * 60 * 60 * 24)); // convert ms to days
}

// Format a date as a short human-readable string like "Jan 1"
function formatDate(month: number, day: number, year: number) {
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Main calendar component — renders the next 5 upcoming horror events
export default function AnimeCalendar() {
  // Memoize the sorted/sliced list so it only recomputes when the component mounts
  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // compare at day precision only

    const year = now.getFullYear();

    return HORROR_DATES
      .map((d) => ({
        ...d,
        days: daysUntil(d.month, d.day, now), // how many days away
        // Resolve the display year: if the event already passed this year, show next year
        displayYear: new Date(year, d.month - 1, d.day) < now ? year + 1 : year,
      }))
      .sort((a, b) => a.days - b.days) // nearest events first
      .slice(0, 5); // show next 5 upcoming events
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      {/* Header — calendar title with emoji */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🗓️</span>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Horror Calendar</h2>
      </div>

      {/* Event list — each item shows icon, name, date, and countdown pill */}
      <ul className="space-y-3">
        {upcoming.map((event, i) => (
          <li key={i} className="flex items-center gap-3">
            {/* Icon — fixed-width column for alignment */}
            <span className="text-xl w-8 text-center flex-shrink-0">{event.icon}</span>

            {/* Event info — name and formatted date */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium leading-tight">{event.label}</p>
              <p className="text-xs text-gray-500">
                {formatDate(event.month, event.day, event.displayYear)}
              </p>
            </div>

            {/* Days-until pill — red highlight for today/soon, muted for later */}
            <div className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
              event.days === 0
                ? 'bg-red-600 text-white'                                     // happening today
                : event.days <= 7
                  ? 'bg-red-600/20 text-red-400 border border-red-600/30'    // within a week
                  : 'bg-gray-800 text-gray-500'                               // further out
            }`}>
              {event.days === 0 ? 'Today!' : `${event.days}d`}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
