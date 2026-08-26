// app/components/ui/UserAvatar.tsx
// Theme-aware avatar with animated border. Used on profile pages.

import { getTheme, getBorder } from '@/app/lib/themes';

type Props = {
  src: string;
  username: string;
  size?: number; // px, default 128
  theme?: string;
  border?: string;
  className?: string;
};

export default function UserAvatar({
  src,
  username,
  size = 128,
  theme = 'default',
  border = 'none',
  className = '',
}: Props) {
  const t = getTheme(theme);
  const b = getBorder(border);

  const px = `${size}px`;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: px, height: px }}>
      {/* Glow layer — animated when border is set */}
      <div
        className={`absolute -inset-1 rounded-full bg-linear-to-br ${t.glow} blur-md ${b.cssClass}`}
        aria-hidden="true"
      />
      <img
        src={src}
        alt={username}
        width={size}
        height={size}
        className="relative rounded-full object-cover border-4 border-gray-950 shadow-2xl"
        style={{ width: px, height: px }}
      />
    </div>
  );
}
