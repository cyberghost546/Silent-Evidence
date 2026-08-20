// lib/moodIcons.ts
// Single source of truth for the icon shown next to a story mood.
//
// Before this module existed the same mood → emoji map was copy-pasted into
// eight different files (for-you, mood/[mood], MoodOfDay, MoodClient, api/og,
// widget, ExploreDropdown, category/[slug]) and they had already drifted apart —
// the same mood rendered a different glyph depending on which page you were on.
// Import MOOD_ICONS from here instead of declaring another local map.
//
// Two vocabularies are in use across the app:
//   - Story mood enum:  CREEPY, PARANOID, DISTURBING, ATMOSPHERIC, PSYCHOLOGICAL,
//                       SUPERNATURAL, GORE, JUMPSCARE
//   - Tone/mood filter: EPIC, HEARTWARMING, MYSTERIOUS, ACTION, ROMANTIC,
//                       COMEDIC, DRAMATIC, DARK
// Both are covered below, so a lookup never needs to know which set it is in.

import {
  Eye, Tornado, Skull, CloudFog, Brain, Ghost, Droplet, Zap,
  Swords, Heart, HelpCircle, Flame, Flower2, Laugh, Drama, Moon,
  type LucideIcon,
} from 'lucide-react';

export const MOOD_ICONS: Record<string, LucideIcon> = {
  // Story mood enum
  CREEPY:        Eye,
  PARANOID:      Tornado,
  DISTURBING:    Skull,
  ATMOSPHERIC:   CloudFog,
  PSYCHOLOGICAL: Brain,
  SUPERNATURAL:  Ghost,
  GORE:          Droplet,
  JUMPSCARE:     Zap,

  // Tone / mood filter
  EPIC:          Swords,
  HEARTWARMING:  Heart,
  MYSTERIOUS:    HelpCircle,
  ACTION:        Flame,
  ROMANTIC:      Flower2,
  COMEDIC:       Laugh,
  DRAMATIC:      Drama,
  DARK:          Moon,
};

// Used when a mood is missing, unknown, or newly added to the enum but not here.
export const FALLBACK_MOOD_ICON: LucideIcon = Drama;

// moodIcon — safe lookup that always returns a renderable component.
export function moodIcon(mood: string | null | undefined): LucideIcon {
  if (!mood) return FALLBACK_MOOD_ICON;
  return MOOD_ICONS[mood] ?? FALLBACK_MOOD_ICON;
}
