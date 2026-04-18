// app/api/admin/settings/route.ts
// GET  — returns all feature flag settings
// POST — upserts a single setting by key

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

export const FEATURE_FLAGS = [
  'registration_open',
  'maintenance_mode',
  'premium_gating',
  'comments_enabled',
  'story_submissions_open',
  'challenge_entries_open',
  'ai_generation_enabled',
  'tipping_enabled',
  'reading_limit_enabled',
] as const;

async function requireAdmin() {
  const userId = await getSessionUserId();
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN';
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...FEATURE_FLAGS] } } });
  const settings: Record<string, boolean> = {};
  for (const flag of FEATURE_FLAGS) {
    const row = rows.find(r => r.key === flag);
    // Default: most features are ON, maintenance_mode is OFF
    settings[flag] = row ? row.value === 'true' : flag !== 'maintenance_mode';
  }
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { key, value } = await req.json();
  if (!FEATURE_FLAGS.includes(key) || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'Invalid key or value.' }, { status: 400 });
  }

  await prisma.siteSetting.upsert({
    where:  { key },
    create: { key, value: String(value) },
    update: { value: String(value) },
  });

  return NextResponse.json({ ok: true });
}
