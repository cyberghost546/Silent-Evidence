// app/components/ui/AdSlot.tsx
// Server component — renders an ad, unless the viewer is a premium member.
//
// Use this ANYWHERE you would previously have used <AdBanner> directly. AdBanner
// itself stays "dumb" (it just draws the slot); this wrapper is what makes the
// "No ads" perk on /premium real.
//
// Why a server component: the premium check has to happen on the server. If a
// client component decided whether to render the ad, the ad markup and its
// network calls would already be in the page before the check ran, and the
// reader would get a flash of an ad they paid not to see.
//
//   <AdSlot slot="leaderboard" />

import { getPremiumContext } from '@/lib/premiumCheck';
import AdBanner from './AdBanner';

type Props = {
  slot?: 'leaderboard' | 'rectangle';
  className?: string;
};

export default async function AdSlot({ slot = 'leaderboard', className = '' }: Props) {
  const { hasPremium } = await getPremiumContext();

  // Premium members get nothing at all — no placeholder, no reserved space, no
  // "Advertisement" label. The layout simply closes up around it.
  if (hasPremium) return null;

  return <AdBanner slot={slot} className={className} />;
}
