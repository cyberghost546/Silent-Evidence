'use client';
// app/components/ui/AvatarPresetPicker.tsx
// Grid of built-in horror avatars. Clicking one calls onSelect with its URL;
// the parent form owns the avatar state and saves it like any other avatar.

import { AVATAR_PRESETS } from '@/app/lib/avatarPresets';

type Props = {
  value: string; // currently selected avatar URL (may be an upload or a preset)
  onSelect: (src: string) => void;
};

export default function AvatarPresetPicker({ value, onSelect }: Props) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATAR_PRESETS.map((p) => {
        const selected = value === p.src;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.src)}
            title={p.label}
            aria-label={`Use ${p.label} avatar`}
            aria-pressed={selected}
            className={`rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
              selected
                ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900'
                : 'opacity-80 hover:opacity-100 hover:scale-105'
            }`}
          >
            <img src={p.src} alt="" className="w-full aspect-square rounded-full" />
          </button>
        );
      })}
    </div>
  );
}
