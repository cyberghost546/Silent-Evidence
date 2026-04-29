// app/api/admin/spotlight/route.ts
// Admin-only endpoints for the Author Spotlight feature.
// GET  — searches published stories by title query (?q=) for the admin to pick from.
// POST — saves the spotlight (sets a story as the currently featured author spotlight).
// Only ADMIN users can call these — requireAdmin() returns null → 403 for everyone else.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const cookieStore = await cookies();
  const id = Number(cookieStore.get('userId')?.value ?? 0);
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  return u?.role === 'ADMIN' ? id : null;
}

export async function GET(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const q = new URL(req.url).searchParams.get('q') ?? '';
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', title: { contains: q } }, take: 8,
    select: { id: true, title: true, slug: true, author: { select: { username: true } } },
  });
  return NextResponse.json({ stories });
}

export async function POST(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { storyId } = await req.json();
  await prisma.siteSetting.upsert({ where: { key: 'spotlight_story_id' }, create: { key: 'spotlight_story_id', value: String(storyId) }, update: { value: String(storyId) } });
  await prisma.auditLog.create({ data: { adminId, action: 'SET_SPOTLIGHT', targetId: storyId, targetType: 'Story', detail: `Set spotlight story to #${storyId}` } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.siteSetting.deleteMany({ where: { key: 'spotlight_story_id' } });
  await prisma.auditLog.create({ data: { adminId, action: 'CLEAR_SPOTLIGHT', detail: 'Cleared story spotlight' } });
  return NextResponse.json({ ok: true });
}
