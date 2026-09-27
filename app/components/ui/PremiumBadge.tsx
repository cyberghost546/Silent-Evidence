// PremiumBadge.tsx
// Displays a small "ANIME ELITE" pill badge with a gold gradient and subtle glow.
// Used on profile pages, story cards, and anywhere a premium user needs recognition.
// This is a pure presentational component — no state, no data fetching.

// Size variants control padding and font size so the badge fits different contexts
type Props = {
  size?: 'sm' | 'md'; // 'sm' for compact spots like cards, 'md' for profile headers
};

export default function PremiumBadge({ size = 'md' }: Props) {
  // Build class strings based on the requested size
  const paddingClass = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textClass = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-bold tracking-widest uppercase
        ${paddingClass} ${textClass}
        /* Gold gradient background — gives a metallic premium feel */
        bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500
        /* Dark text stays legible on the bright gold background */
        text-gray-900
        /* Subtle warm glow so the badge catches the eye on dark backgrounds */
        shadow-[0_0_8px_rgba(251,191,36,0.6)]
        /* Thin gold border reinforces the premium look */
        border border-yellow-300/60
      `}
    >
      {/* Lightning bolt icon — represents elite energy and speed */}
      ANIME ELITE
    </span>
  );
}
