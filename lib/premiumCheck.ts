// lib/premiumCheck.ts
// Returns true when the user should receive premium access:
//   - active subscription   OR
//   - ADMIN role (admins always see everything for free)

import { prisma } from '@/lib/prisma';

export async function hasPremiumAccess(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true, subscription: { select: { status: true } } },
  });
  return user?.role === 'ADMIN' || user?.subscription?.status === 'active';
}
