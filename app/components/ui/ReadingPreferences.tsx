'use client';
// app/components/ui/ReadingPreferences.tsx
//
// A per-reader "how this story looks" panel: font, size, line spacing, column
// width, and a reading theme (default / sepia / high-contrast). It exists to make
// long horror stories comfortable to read and to serve accessibility needs
// (larger text, wider line spacing, a dyslexia-friendlier face, higher contrast).
//
// DESIGN DECISIONS
//   - Per device, not per account. Reading comfort is a device thing (phone vs
//     desktop), it should work for signed-out readers too, and it must not be
//     paywalled. So preferences live in localStorage, not the database.
//   - Applied through CSS custom properties on <html>, each with a fallback that
//     equals the current styling. Until a reader changes something, every value
//     resolves to its fallback and the page looks exactly as it does today — no
//     visual change is forced on anyone.
//   - System fonts only. The site's CSP is `font-src 'self'`, so we cannot pull a
//     web font like OpenDyslexic. The "Legible" option therefore uses a system
//     stack chosen for letter distinction rather than a true dyslexia font.
//
// The story body (StoryContent) consumes these properties. This component only
// owns the controls and the persistence.

import { useEffect, useState, useCallback } from 'react';

const LS_KEY = 'se_reading_prefs_v1';

type FontKey = 'default' | 'serif' | 'sans' | 'legible';
type ThemeKey = 'default' | 'sepia' | 'contrast';

interface Prefs {
  font: FontKey;
  /** Body font-size in rem. */
  size: number;
  /** Unitless line-height. */
  leading: number;
  /** Reading column max-width in ch. */
  width: number;
  theme: ThemeKey;
}

// Defaults chosen so every derived CSS value equals the story body's current look
// (prose-lg ≈ 1.125rem / 1.75 line-height), meaning "no override" is invisible.
const DEFAULTS: Prefs = { font: 'default', size: 1.125, leading: 1.75, width: 70, theme: 'default' };

const FONT_STACKS: Record<FontKey, string> = {
  // '' lets the body inherit the site font — the untouched default.
  default: '',
  serif: 'Georgia, Cambria, "Times New Roman", serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  // Not a licensed dyslexia font (CSP blocks external fonts); a system stack with
  // clearly distinguished letterforms is the best we can self-host.
  legible: '"Comic Sans MS", "Trebuchet MS", Verdana, system-ui, sans-serif',
};

// Reading surface colours per theme. `default` uses transparent/inherit so the
// site's own dark background shows through unchanged.
const THEME_VARS: Record<ThemeKey, { bg: string; fg: string }> = {
  default:  { bg: 'transparent', fg: 'inherit' },
  sepia:    { bg: '#f4ecd8', fg: '#3a2f1c' },
  contrast: { bg: '#000000', fg: '#ffffff' },
};

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    // Merge over defaults so a partial or older stored shape still yields a full,
    // valid set rather than undefined values reaching the CSS.
    return {
      font: (['default', 'serif', 'sans', 'legible'] as FontKey[]).includes(parsed.font as FontKey) ? parsed.font as FontKey : DEFAULTS.font,
      size: clamp(Number(parsed.size), 0.875, 1.75, DEFAULTS.size),
      leading: clamp(Number(parsed.leading), 1.3, 2.4, DEFAULTS.leading),
      width: clamp(Number(parsed.width), 45, 95, DEFAULTS.width),
      theme: (['default', 'sepia', 'contrast'] as ThemeKey[]).includes(parsed.theme as ThemeKey) ? parsed.theme as ThemeKey : DEFAULTS.theme,
    };
  } catch {
    return DEFAULTS;
  }
}

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Writes the preferences onto <html> as CSS custom properties. */
function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  root.style.setProperty('--reading-font', FONT_STACKS[p.font] || 'inherit');
  root.style.setProperty('--reading-size', `${p.size}rem`);
  root.style.setProperty('--reading-leading', String(p.leading));
  root.style.setProperty('--reading-width', `${p.width}ch`);
  root.style.setProperty('--reading-bg', THEME_VARS[p.theme].bg);
  root.style.setProperty('--reading-fg', THEME_VARS[p.theme].fg);
  // Themed backgrounds get inner padding; the default theme stays flush (0) so the
  // reading column sits exactly where it did before any preference was set.
  root.style.setProperty('--reading-pad', p.theme === 'default' ? '0' : '1.5rem');
}

export default function ReadingPreferences() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  // Load once on mount and apply. This must run after hydration, not in a state
  // initializer: localStorage is client-only, and reading it during SSR/first
  // render would cause a hydration mismatch. The set-state-in-effect lint rule
  // does not fit this "sync from an external store on mount" case.
  useEffect(() => {
    const loaded = loadPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loaded);
    applyPrefs(loaded);
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      applyPrefs(next);
      try { window.localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* storage may be unavailable */ }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    applyPrefs(DEFAULTS);
    setPrefs(DEFAULTS);
    try { window.localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Reading preferences"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition"
      >
        {/* Simple 'Aa' glyph — recognisable as text settings */}
        <span className="font-semibold">Aa</span>
        <span className="hidden sm:inline">Reading</span>
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-2 w-72 z-50 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Reading preferences</h3>
              <button type="button" onClick={reset} className="text-[11px] text-gray-500 hover:text-white transition">Reset</button>
            </div>

            {/* Font */}
            <Field label="Font">
              <div className="grid grid-cols-4 gap-1">
                {([['default', 'Aa'], ['serif', 'Serif'], ['sans', 'Sans'], ['legible', 'Legible']] as [FontKey, string][]).map(([val, lbl]) => (
                  <Pill key={val} active={prefs.font === val} onClick={() => update({ font: val })}>{lbl}</Pill>
                ))}
              </div>
            </Field>

            {/* Size */}
            <Field label={`Text size — ${Math.round(prefs.size * 100 / 1.125)}%`}>
              <input
                type="range" min={0.875} max={1.75} step={0.0625}
                value={prefs.size}
                onChange={(e) => update({ size: Number(e.target.value) })}
                className="w-full accent-red-600"
                aria-label="Text size"
              />
            </Field>

            {/* Line spacing */}
            <Field label="Line spacing">
              <input
                type="range" min={1.3} max={2.4} step={0.05}
                value={prefs.leading}
                onChange={(e) => update({ leading: Number(e.target.value) })}
                className="w-full accent-red-600"
                aria-label="Line spacing"
              />
            </Field>

            {/* Width */}
            <Field label="Column width">
              <input
                type="range" min={45} max={95} step={1}
                value={prefs.width}
                onChange={(e) => update({ width: Number(e.target.value) })}
                className="w-full accent-red-600"
                aria-label="Column width"
              />
            </Field>

            {/* Theme */}
            <Field label="Reading theme">
              <div className="grid grid-cols-3 gap-1">
                {([['default', 'Default'], ['sepia', 'Sepia'], ['contrast', 'Contrast']] as [ThemeKey, string][]).map(([val, lbl]) => (
                  <Pill key={val} active={prefs.theme === val} onClick={() => update({ theme: val })}>{lbl}</Pill>
                ))}
              </div>
            </Field>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1.5 text-xs rounded-lg border transition ${active ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
    >
      {children}
    </button>
  );
}
