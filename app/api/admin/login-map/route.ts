// GET /api/admin/login-map — returns login events that have geo data for the map.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/apiError';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Return the 500 most recent logins that have coordinates
    const logs = await prisma.loginLog.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, username: true, country: true, city: true,
        lat: true, lng: true, success: true, createdAt: true, ip: true,
      },
    });

    // Count by country for the summary table
    const byCountry = logs.reduce<Record<string, number>>((acc, l) => {
      const key = l.country ?? 'Unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const countrySummary = Object.entries(byCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    return NextResponse.json({
      markers: logs.map(l => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      countrySummary,
      total: logs.length,
    });
  } catch (err) {
    console.error('[GET /api/admin/login-map]', err);
    return serverError();
  }
}
