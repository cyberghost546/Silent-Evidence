// app/lib/avatarPresets.ts
// Built-in horror avatars users can pick instead of uploading a photo.
// The SVGs live in public/avatars/presets/ and are stored on Profile.avatar
// as a same-origin path, so no CSP or image-domain config is needed.

export type AvatarPreset = { id: string; label: string; src: string };

const ids: [string, string][] = [
  ['skull', 'Skull'],
  ['ghost', 'Ghost'],
  ['raven', 'Raven'],
  ['eye', 'The Eye'],
  ['candle', 'Candle'],
  ['blood-moon', 'Blood Moon'],
  ['spider', 'Spider'],
  ['plague-doctor', 'Plague Doctor'],
  ['hooded', 'Hooded Figure'],
  ['skeleton-key', 'Skeleton Key'],
  ['pumpkin', 'Jack-o’-Lantern'],
  ['tombstone', 'Tombstone'],
];

export const AVATAR_PRESETS: AvatarPreset[] = ids.map(([id, label]) => ({
  id,
  label,
  src: `/avatars/presets/${id}.svg`,
}));
