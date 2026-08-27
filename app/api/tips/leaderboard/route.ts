// app/api/tips/leaderboard/route.ts
// GET — returns top 5 most-tipped authors for the current calendar month.
// Groups tips by recipient, sums amounts, joins user/profile data.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  // Start of current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Aggregate tips received this month grouped by recipient
  const grouped = await prisma.tip.groupBy({
    by: ['toUserId'],
    where: { createdAt: { gte: monthStart } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 5,
  });

  if (grouped.length === 0) return NextResponse.json([]);

  // Fetch user details for each recipient
  const userIds = grouped.map((g) => g.toUserId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      isVerified: true,
      profile: { select: { avatar: true } },
    },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const result = grouped
    .filter((g) => userMap[g.toUserId]) // skip if user was deleted
    .map((g) => ({
      username: userMap[g.toUserId].username,
      avatar: userMap[g.toUserId].profile?.avatar ?? null,
      isVerified: userMap[g.toUserId].isVerified,
      totalTips: g._sum.amount ?? 0,
    }));

  return NextResponse.json(result);
}
