// ChallengeCountdownSection.tsx
// Server component that fetches the next active challenge from the DB
// and passes it to the client-side ChallengeCountdown component.
// Returns null if there is no active challenge with a future end date.

import { prisma } from '@/lib/prisma';
import ChallengeCountdown from './ChallengeCountdown';

export default async function ChallengeCountdownSection() {
  // Find the next upcoming or currently active challenge
  const now = new Date();

  const challenge = await prisma.challenge.findFirst({
    where: {
      active: true,
      endDate: { gt: now },
    },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      active: true,
    },
  });

  if (!challenge) return null;

  return (
    <ChallengeCountdown
      challenge={{
        ...challenge,
        startDate: challenge.startDate.toISOString(),
        endDate:   challenge.endDate.toISOString(),
      }}
    />
  );
}
