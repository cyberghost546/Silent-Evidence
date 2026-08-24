// lib/moodIcons.ts
// Single source of truth for the icon shown next to a story mood.
//
// Before this module existed the same mood → emoji map was copy-pasted into
// eight different files (for-you, mood/[mood], MoodOfDay, MoodClient, api/og,
// widget, ExploreDropdown, category/[slug]) and they had already drifted apart —
// the same mood rendered a different glyph depending on which page you were on.
// Import MOOD_ICONS from here instead of declaring another local map.
//
// This file used to map TWO vocabularies, because the app had split into a
// horror mood set and a generic-fiction one and a lookup could receive either.
// That split has since been resolved in favour of the horror set — see
// lib/moods.ts, which is now the single source of truth for the vocabulary
// itself (values, labels, descriptions, colours). This file covers icons only,
// and its keys must stay in step with MOODS there.

import {
  Eye, Tornado, Skull, CloudFog, Brain, Ghost, Droplet, Zap, Drama, Moon,
  type LucideIcon,
} from 'lucide-react';

export const MOOD_ICONS: Record<string, LucideIcon> = {
  CREEPY:        Eye,
  PARANOID:      Tornado,
  DISTURBING:    Skull,
  ATMOSPHERIC:   CloudFog,
  PSYCHOLOGICAL: Brain,
  SUPERNATURAL:  Ghost,
  GORE:          Droplet,
  JUMPSCARE:     Zap,
  DARK:          Moon,
};

// Used when a mood is missing, unknown, or newly added to the enum but not here.
export const FALLBACK_MOOD_ICON: LucideIcon = Drama;

// moodIcon — safe lookup that always returns a renderable component.
export function moodIcon(mood: string | null | undefined): LucideIcon {
  if (!mood) return FALLBACK_MOOD_ICON;
  return MOOD_ICONS[mood] ?? FALLBACK_MOOD_ICON;
}
