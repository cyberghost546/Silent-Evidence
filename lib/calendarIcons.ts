// lib/calendarIcons.ts
// Icon choices for admin-created calendar events.
//
// STORAGE FORMAT — same convention as lib/reactions: each `id` is the exact
// string already persisted in CalendarEvent.icon. Those ids were originally the
// emoji characters themselves, so they still look like emoji here, but nothing
// renders them any more — the UI draws `icon` instead. Changing an id would
// orphan every existing event that used the old value, so leave them alone and
// only append new ones.

import {
  CalendarDays,
  Ghost,
  Skull,
  Flame,
  Axe,
  Droplet,
  Bird,
  Bug,
  Moon,
  Archive,
  Drama,
  BookOpen,
  Sparkles,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';

export type EventIconOption = { id: string; icon: LucideIcon; label: string };

export const EVENT_ICON_OPTIONS: EventIconOption[] = [
  { id: '📅', icon: CalendarDays, label: 'Date' },
  { id: '🎃', icon: Ghost, label: 'Halloween' },
  { id: '💀', icon: Skull, label: 'Skull' },
  { id: '🕯️', icon: Flame, label: 'Candle' },
  { id: '👻', icon: Ghost, label: 'Ghost' },
  { id: '🔪', icon: Axe, label: 'Blade' },
  { id: '🩸', icon: Droplet, label: 'Blood' },
  { id: '🦇', icon: Bird, label: 'Bat' },
  { id: '🕷️', icon: Bug, label: 'Spider' },
  { id: '🌕', icon: CircleDot, label: 'Full moon' },
  { id: '⚰️', icon: Archive, label: 'Coffin' },
  { id: '🎭', icon: Drama, label: 'Masks' },
  { id: '📖', icon: BookOpen, label: 'Story' },
  { id: '🌑', icon: Moon, label: 'New moon' },
  { id: '🔮', icon: Sparkles, label: 'Occult' },
];

/** Default id used when an event has no icon set. */
export const DEFAULT_EVENT_ICON_ID = EVENT_ICON_OPTIONS[0].id;

/** Resolves a stored id to a renderable icon, falling back for unknown values. */
export function eventIcon(id: string | null | undefined): LucideIcon {
  if (!id) return CalendarDays;
  return EVENT_ICON_OPTIONS.find((o) => o.id === id)?.icon ?? CalendarDays;
}
