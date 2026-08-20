// Shared theme + avatar border definitions used by profile pages and the appearance picker.
// Each entry carries a lucide-react icon component rather than an emoji so the
// picker renders in the same visual language as the rest of the UI.

import {
  Droplet, Ghost, CircleOff, Skull, Moon, Radiation, Square, Sparkle, Orbit, Zap,
} from 'lucide-react';

export const THEMES = {
  default: {
    name: 'Blood Red',  icon: Droplet,
    glow:   'from-red-600/50 to-red-900/20',
    hero:   'from-red-950 via-gray-900 to-gray-950',
    heroRadial: 'bg-[radial-gradient(ellipse_80%_60%_at_20%_40%,rgba(220,38,38,0.18),transparent)]',
    accent: 'text-red-400',
  },
  ghost: {
    name: 'Ghost Blue', icon: Ghost,
    glow:   'from-blue-500/40 to-blue-900/10',
    hero:   'from-blue-950 via-gray-900 to-gray-950',
    heroRadial: 'bg-[radial-gradient(ellipse_80%_60%_at_20%_40%,rgba(59,130,246,0.18),transparent)]',
    accent: 'text-blue-400',
  },
  void: {
    name: 'Void',       icon: CircleOff,
    glow:   'from-purple-600/50 to-purple-900/10',
    hero:   'from-purple-950 via-gray-900 to-gray-950',
    heroRadial: 'bg-[radial-gradient(ellipse_80%_60%_at_20%_40%,rgba(147,51,234,0.18),transparent)]',
    accent: 'text-purple-400',
  },
  crimson: {
    name: 'Crimson',    icon: Skull,
    glow:   'from-rose-700/60 to-rose-950/10',
    hero:   'from-rose-950 via-gray-900 to-gray-950',
    heroRadial: 'bg-[radial-gradient(ellipse_80%_60%_at_20%_40%,rgba(225,29,72,0.20),transparent)]',
    accent: 'text-rose-400',
  },
  shadow: {
    name: 'Shadow',     icon: Moon,
    glow:   'from-green-600/40 to-green-900/10',
    hero:   'from-green-950 via-gray-900 to-gray-950',
    heroRadial: 'bg-[radial-gradient(ellipse_80%_60%_at_20%_40%,rgba(34,197,94,0.14),transparent)]',
    accent: 'text-green-400',
  },
  toxic: {
    name: 'Toxic',      icon: Radiation,
    glow:   'from-lime-500/40 to-lime-900/10',
    hero:   'from-lime-950 via-gray-900 to-gray-950',
    heroRadial: 'bg-[radial-gradient(ellipse_80%_60%_at_20%_40%,rgba(132,204,22,0.15),transparent)]',
    accent: 'text-lime-400',
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export const BORDERS = {
  none:    { name: 'None',         icon: Square,  cssClass: '' },
  pulse:   { name: 'Pulse Glow',   icon: Sparkle, cssClass: 'avatar-border-pulse' },
  spin:    { name: 'Orbit Ring',   icon: Orbit,   cssClass: 'avatar-border-spin' },
  flicker: { name: 'Flicker',      icon: Zap,     cssClass: 'avatar-border-flicker' },
} as const;

export type BorderKey = keyof typeof BORDERS;

export function getTheme(key: string) {
  return THEMES[(key as ThemeKey)] ?? THEMES.default;
}

export function getBorder(key: string) {
  return BORDERS[(key as BorderKey)] ?? BORDERS.none;
}
