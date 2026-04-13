// lib/streaks.ts
// Updates the writing streak for a user whenever they publish a story.
// Called as a fire-and-forget side effect from the story publish API route.
// Logic mirrors lib/badges.ts in structure.

import { prisma } from './prisma';

export async function updateWritingStreak(userId: number) {
  // Load or create the streak row for this user
  const existing = await prisma.writingStreak.findUnique({ where: { userId } });

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0); // Normalise to start-of-day UTC for day-diff math

  let currentStreak = 1;
  let longestStreak = existing?.longestStreak ?? 1;

  if (existing?.lastPublishedAt) {
    const lastUTC = new Date(existing.lastPublishedAt);
    lastUTC.setUTCHours(0, 0, 0, 0);
    const daysDiff = Math.round((todayUTC.getTime() - lastUTC.getTime()) / 86_400_000);

    if (daysDiff === 0) {
      // Same calendar day — don't change the streak, just return
      return;
    } else if (daysDiff === 1) {
      // Consecutive day — extend the streak
      currentStreak = (existing.currentStreak ?? 0) + 1;
    } else {
      // Gap of 2+ days — streak broken, reset to 1
      currentStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  await prisma.writingStreak.upsert({
    where:  { userId },
    update: { currentStreak, longestStreak, lastPublishedAt: todayUTC },
    create: { userId, currentStreak, longestStreak, lastPublishedAt: todayUTC },
  });
}
