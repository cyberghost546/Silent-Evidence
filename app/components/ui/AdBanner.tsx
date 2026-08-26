'use client';
// app/components/ui/AdBanner.tsx
// Reusable ad slot component.
// Pass `slot="leaderboard"` for a 728×90-style wide banner,
// or `slot="rectangle"` for a 300×250-style box.
//
// To wire up a real ad network (e.g. Google AdSense) replace the
// placeholder div with the network's <ins> or <script> tag.

type Slot = 'leaderboard' | 'rectangle';

type Props = {
  slot?: Slot;
  className?: string;
};

export default function AdBanner({ slot = 'leaderboard', className = '' }: Props) {
  const isLeaderboard = slot === 'leaderboard';

  return (
    <div className={`w-full flex flex-col items-center gap-1 ${className}`}>
      {/* "Advertisement" label — required by most ad networks */}
      <p className="text-[10px] uppercase tracking-widest text-gray-700 select-none">
        Advertisement
      </p>

      {/* Ad container — replace the inner content with a real ad tag */}
      <div
        className={`
          relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900
          flex items-center justify-center
          ${isLeaderboard ? 'w-full h-24 max-w-4xl' : 'w-72 h-60'}
        `}
      >
        {/* Placeholder creative — swap this out for your ad network script */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900" />
        <div className="relative flex flex-col items-center gap-2 text-center px-4">
          <p className="text-xs text-gray-600 font-medium">Your ad here</p>
          <p className="text-[10px] text-gray-700">{isLeaderboard ? '728 × 90' : '300 × 250'}</p>
        </div>
      </div>
    </div>
  );
}
