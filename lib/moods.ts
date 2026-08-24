// lib/moods.ts
// Single source of truth for the story mood vocabulary.
//
// WHY THIS EXISTS
// The mood list had been copy-pasted into roughly a dozen files and had split
// into two incompatible vocabularies that were both in active use:
//
//   - a horror set (CREEPY, PARANOID, DISTURBING, …) used by the admin tools,
//     the AI generators, and mood auto-detection; and
//   - a generic-fiction set (EPIC, HEARTWARMING, ROMANTIC, COMEDIC, …),
//     left over from a non-horror template, which was what the Prisma enum
//     actually accepted and what the reader-facing pages rendered.
//
// The consequences were real: AI-generated stories threw a Prisma enum error on
// insert, and setting the mood of the day to CREEPY made the homepage banner
// render "Unknown". lib/moodIcons.ts had already noticed the split and papered
// over it by mapping both sets.
//
// The horror set won, because this is a horror site. DARK was kept from the old
// set so existing stories stayed valid without a data migration.
//
// RULE: never hard-code a mood list again. Import MOODS or MOOD_META from here.
// The values must stay in step with `enum Mood` in prisma/schema.prisma.

/** Every valid Story.mood value, in display order. */
export const MOODS = [
  'CREEPY',
  'PARANOID',
  'DISTURBING',
  'ATMOSPHERIC',
  'PSYCHOLOGICAL',
  'SUPERNATURAL',
  'GORE',
  'JUMPSCARE',
  'DARK',
] as const;

export type Mood = (typeof MOODS)[number];

/** Runtime guard — narrows an untrusted string to a Mood. */
export function isMood(value: unknown): value is Mood {
  return typeof value === 'string' && (MOODS as readonly string[]).includes(value);
}

// Per-mood presentation. `color` bundles the text/border/background Tailwind
// classes used by the mood pills; `bg`/`text`/`border` are the separate fields
// the homepage banner needs. Both shapes live here so neither caller has to
// invent its own palette and drift again.
export interface MoodMeta {
  label: string;
  description: string;
  /** Combined pill classes: text + border + background. */
  color: string;
  /** Banner styling, kept separate because MoodOfDay composes them differently. */
  bg: string;
  text: string;
  border: string;
  /** Solid swatch class for pickers that show a colour dot rather than a tint. */
  accent: string;
}

export const MOOD_META: Record<Mood, MoodMeta> = {
  CREEPY: {
    label: 'Creepy',
    description: 'The slow crawl of something not quite right.',
    color: 'text-lime-400 border-lime-500/30 bg-lime-500/10',
    bg: 'bg-lime-950/40', text: 'text-lime-400', border: 'border-lime-900/50',
    accent: 'bg-lime-500',
  },
  PARANOID: {
    label: 'Paranoid',
    description: 'Someone is watching, and you cannot prove it.',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-900/50',
    accent: 'bg-amber-500',
  },
  DISTURBING: {
    label: 'Disturbing',
    description: 'Images that refuse to leave once you have read them.',
    color: 'text-red-400 border-red-500/30 bg-red-500/10',
    bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-900/50',
    accent: 'bg-red-500',
  },
  ATMOSPHERIC: {
    label: 'Atmospheric',
    description: 'Dread built slowly out of place and silence.',
    color: 'text-slate-300 border-slate-400/30 bg-slate-400/10',
    bg: 'bg-slate-900/60', text: 'text-slate-300', border: 'border-slate-700/50',
    accent: 'bg-slate-400',
  },
  PSYCHOLOGICAL: {
    label: 'Psychological',
    description: 'The horror is inside the narrator, not the house.',
    color: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    bg: 'bg-violet-950/40', text: 'text-violet-400', border: 'border-violet-900/50',
    accent: 'bg-violet-500',
  },
  SUPERNATURAL: {
    label: 'Supernatural',
    description: 'Spirits, curses, and things that break the rules.',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-900/50',
    accent: 'bg-cyan-500',
  },
  GORE: {
    label: 'Gore',
    description: 'Visceral, bloody, and not looking away.',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-900/50',
    accent: 'bg-rose-500',
  },
  JUMPSCARE: {
    label: 'Jumpscare',
    description: 'Quiet, quiet, quiet — then not.',
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-900/50',
    accent: 'bg-yellow-500',
  },
  DARK: {
    label: 'Dark',
    description: 'Grim themes and moral ambiguity.',
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    bg: 'bg-gray-950/60', text: 'text-gray-300', border: 'border-gray-700/50',
    accent: 'bg-gray-500',
  },
};

/** Shown when a mood is missing or unrecognised. */
export const FALLBACK_MOOD_META: MoodMeta = {
  label: 'Unknown',
  description: 'No mood set.',
  color: 'text-gray-400 border-gray-600/30 bg-gray-600/10',
  bg: 'bg-gray-900/40', text: 'text-gray-400', border: 'border-gray-700/50',
  accent: 'bg-gray-600',
};

/** Safe lookup that always returns renderable metadata. */
export function moodMeta(mood: string | null | undefined): MoodMeta {
  if (!mood) return FALLBACK_MOOD_META;
  return MOOD_META[mood as Mood] ?? FALLBACK_MOOD_META;
}

/** Convenience: `[{ value, label }]`, the shape most pickers and selects want. */
export const MOOD_OPTIONS = MOODS.map((value) => ({
  value,
  label: MOOD_META[value].label,
}));
