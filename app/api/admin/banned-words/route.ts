// GET  — list all banned words
// POST — add a new banned word
// DELETE — remove a banned word (id in body)
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const cookieStore = await cookies();
  const id = Number(cookieStore.get('userId')?.value ?? 0);
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!u || u.role !== 'ADMIN') return null;
  return id;
}

export async function GET() {
  const words = await prisma.bannedWord.findMany({ orderBy: { word: 'asc' } });
  return NextResponse.json(words);
}

export async function POST(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { word } = await req.json();
  if (!word || typeof word !== 'string') return NextResponse.json({ error: 'Word required' }, { status: 400 });
  const cleaned = word.toLowerCase().trim();
  const created = await prisma.bannedWord.upsert({
    where: { word: cleaned }, create: { word: cleaned }, update: {},
  });
  await prisma.auditLog.create({ data: { adminId, action: 'ADD_BANNED_WORD', detail: `Added banned word: "${cleaned}"` } });
  return NextResponse.json(created);
}

export async function DELETE(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  await prisma.bannedWord.delete({ where: { id } });
  await prisma.auditLog.create({ data: { adminId, action: 'REMOVE_BANNED_WORD', detail: `Removed banned word id ${id}` } });
  return NextResponse.json({ ok: true });
}
