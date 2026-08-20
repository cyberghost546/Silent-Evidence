'use client';
// Settings section — lets premium members pick a profile theme and avatar border animation.

import { useState } from 'react';
import { THEMES, BORDERS, type ThemeKey, type BorderKey } from '@/app/lib/themes';

type Props = {
  initialTheme: string;
  initialBorder: string;
  isPremium: boolean;
};

export default function PremiumAppearancePicker({ initialTheme, initialBorder, isPremium }: Props) {
  const [theme,  setTheme]  = useState<ThemeKey>(initialTheme  as ThemeKey  || 'default');
  const [border, setBorder] = useState<BorderKey>(initialBorder as BorderKey || 'none');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/user/appearance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileTheme: theme, avatarBorder: border }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!isPremium) {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center">
        <p className="text-sm font-semibold text-white mb-1">Premium Cosmetics</p>
        <p className="text-xs text-gray-500 mb-4">Unlock custom profile themes and animated avatar borders with a premium subscription.</p>
        <a href="/premium" className="inline-block px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-xl transition">
          Upgrade to Premium
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme picker */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-3">Profile Theme</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, t]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition ${
                theme === key
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              <t.icon className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-medium leading-tight text-center">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Border picker */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-3">Avatar Border Animation</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(BORDERS) as [BorderKey, typeof BORDERS[BorderKey]][]).map(([key, b]) => (
            <button
              key={key}
              type="button"
              onClick={() => setBorder(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition ${
                border === key
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              <b.icon className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-medium">{b.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-4 p-4 bg-gray-800/40 rounded-xl border border-gray-700">
        <div className="relative w-16 h-16 shrink-0">
          <div className={`absolute -inset-1 rounded-full bg-linear-to-br ${THEMES[theme].glow} blur-md ${BORDERS[border].cssClass}`} />
          <div className="relative w-16 h-16 rounded-full bg-gray-700 border-4 border-gray-950 flex items-center justify-center text-2xl">
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Preview</p>
          <p className={`text-xs mt-0.5 ${THEMES[theme].accent}`}>{THEMES[theme].name} · {BORDERS[border].name}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-sm font-bold rounded-xl transition"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Appearance'}
      </button>
    </div>
  );
}
