// app/components/ui/MoodOfDay.tsx
// Server component — fetches and displays the admin-set Mood of the Day banner.
// Returns null if no mood has been set, so the banner simply disappears.

import { prisma } from '@/lib/prisma';

// Mood → display config (emoji, label, colour classes)
const MOOD_CONFIG: Record<string, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  EPIC:         { emoji: '⚔️',  label: 'Epic',         bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-900/50' },
  HEARTWARMING: { emoji: '🕯️', label: 'Heartwarming',  bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-900/50' },
  MYSTERIOUS:   { emoji: '🌫️', label: 'Mysterious',    bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-900/50' },
  ACTION:       { emoji: '💥',  label: 'Action',        bg: 'bg-red-950/40',    text: 'text-red-400',    border: 'border-red-900/50'    },
  ROMANTIC:     { emoji: '🥀',  label: 'Romantic',      bg: 'bg-pink-950/40',   text: 'text-pink-400',   border: 'border-pink-900/50'   },
  COMEDIC:      { emoji: '🎭',  label: 'Comedic',       bg: 'bg-green-950/40',  text: 'text-green-400',  border: 'border-green-900/50'  },
  DRAMATIC:     { emoji: '🩸',  label: 'Dramatic',      bg: 'bg-red-950/40',    text: 'text-red-400',    border: 'border-red-900/50'    },
  DARK:         { emoji: '🕷️', label: 'Dark',           bg: 'bg-gray-950/60',   text: 'text-gray-300',   border: 'border-gray-700/50'   },
};

const FALLBACK = { emoji: '👻', label: 'Unknown', bg: 'bg-gray-900/40', text: 'text-gray-400', border: 'border-gray-700/50' };

export default async function MoodOfDay() {
  const row = await prisma.moodOfDay.findFirst({
    orderBy: { setAt: 'desc' },
    select: { mood: true, message: true },
  }).catch(() => null);

  if (!row) return null;

  const cfg = MOOD_CONFIG[row.mood] ?? FALLBACK;

  return (
    <div className={`${cfg.bg} border-b ${cfg.border} px-4 py-3`}>
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <span className="text-xl shrink-0 select-none">{cfg.emoji}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-widest font-medium shrink-0">
            Today&apos;s mood:
          </span>
          <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
          {row.message && (
            <span className="text-sm text-gray-400 italic">— {row.message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
