// app/api/admin/ip-blocklist/route.ts
// GET    — returns the current IP blocklist
// POST   — adds an IP/CIDR to the blocklist
// DELETE — removes an IP/CIDR from the blocklist
//
// The blocklist is stored as JSON in SiteSetting with key "ip_blocklist".
// To enforce the blocklist, call isIpBlocked(ip) from lib/ipBlocklist.ts in your API routes.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

const SETTING_KEY = 'ip_blocklist';

async function requireAdmin() {
  const userId = await getSessionUserId();
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN';
}

async function getList(): Promise<{ ip: string; reason: string; addedAt: string }[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } });
  try {
    return row ? JSON.parse(row.value) : [];
  } catch {
    return [];
  }
}

async function saveList(list: { ip: string; reason: string; addedAt: string }[]) {
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(list) },
    update: { value: JSON.stringify(list) },
  });
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  return NextResponse.json({ blocklist: await getList() });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { ip, reason = '' } = await req.json();
  if (!ip || typeof ip !== 'string' || ip.trim().length === 0) {
    return NextResponse.json({ error: 'IP address is required.' }, { status: 400 });
  }

  const list = await getList();
  if (list.some((e) => e.ip === ip.trim())) {
    return NextResponse.json({ error: 'This IP is already blocked.' }, { status: 409 });
  }

  list.push({ ip: ip.trim(), reason: reason.trim(), addedAt: new Date().toISOString() });
  await saveList(list);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { ip } = await req.json();
  const list = await getList();
  await saveList(list.filter((e) => e.ip !== ip));
  return NextResponse.json({ ok: true });
}
