// app/api/admin/rate-limits/route.ts
// GET  — returns current in-memory rate limit entries (non-expired only)
// DELETE — clears a specific key or all entries

import { NextResponse } from 'next/server';
import { store } from '@/lib/rateLimit';
import { getSessionUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const userId = await getSessionUserId();
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN';
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const now = Date.now();
  const entries = [];
  for (const [key, val] of store.entries()) {
    // Only include active (non-expired) windows — use a generous 1h cutoff
    if (now - val.windowStart < 60 * 60 * 1000) {
      const [ip, ...routeParts] = key.split(':');
      entries.push({
        key,
        ip,
        route: routeParts.join(':'),
        count: val.count,
        windowStart: new Date(val.windowStart).toISOString(),
        ageSeconds: Math.floor((now - val.windowStart) / 1000),
      });
    }
  }

  // Sort by count descending so the busiest IPs are at the top
  entries.sort((a, b) => b.count - a.count);
  return NextResponse.json({ entries, total: entries.length });
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { key } = await req.json().catch(() => ({}));
  if (key) {
    store.delete(key);
  } else {
    store.clear();
  }
  return NextResponse.json({ ok: true });
}
