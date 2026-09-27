// app/components/ui/MoodOfDay.tsx
// Server component — fetches and displays the admin-set Mood of the Day banner.
// Returns null if no mood has been set, so the banner simply disappears.

import { prisma } from '@/lib/prisma';
import { createElement } from 'react';
import { moodIcon } from '@/lib/moodIcons';
import { moodMeta } from '@/lib/moods';

// Display config now comes from lib/moods.ts. The local map this replaced held
// the generic-fiction vocabulary (Epic, Heartwarming, Romantic …) while the
// admin mood-of-day tool wrote horror moods, so every mood an admin actually set
// missed the map and this banner rendered "Unknown".

export default async function MoodOfDay() {
  const row = await prisma.moodOfDay
    .findFirst({
      orderBy: { setAt: 'desc' },
      select: { mood: true, message: true },
    })
    .catch(() => null);

  if (!row) return null;

  const cfg = moodMeta(row.mood);

  return (
    <div className={`${cfg.bg} border-b ${cfg.border} px-4 py-3`}>
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        {createElement(moodIcon(row.mood), {
          className: `w-5 h-5 shrink-0 ${cfg.text}`,
          strokeWidth: 1.5,
          'aria-hidden': 'true',
        })}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-widest font-medium shrink-0">
            Today&apos;s mood:
          </span>
          <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
          {row.message && <span className="text-sm text-gray-400 italic">— {row.message}</span>}
        </div>
      </div>
    </div>
  );
}
