// app/api/admin/email-templates/route.ts
// GET  — returns all email templates stored in SiteSetting
// POST — saves/updates a single template by key

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

const TEMPLATE_KEYS = ['email_welcome', 'email_newsletter', 'email_digest', 'email_follow_notify'];

async function requireAdmin() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN' ? userId : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: TEMPLATE_KEYS } },
  });

  const templates: Record<string, string> = {};
  for (const key of TEMPLATE_KEYS) {
    templates[key] = rows.find((r) => r.key === key)?.value ?? defaultTemplate(key);
  }

  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { key, value } = await req.json();
  if (!TEMPLATE_KEYS.includes(key) || typeof value !== 'string') {
    return NextResponse.json({ error: 'Invalid template key or value.' }, { status: 400 });
  }

  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

  return NextResponse.json({ ok: true });
}

function defaultTemplate(key: string): string {
  const base = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#111;color:#eee;border-radius:12px;overflow:hidden;">
  <div style="background:#dc2626;padding:20px 24px;">
    <h1 style="margin:0;font-size:20px;color:#fff;">Silent Evidence</h1>
  </div>
  <div style="padding:24px;">
    {{CONTENT}}
  </div>
  <div style="padding:12px 24px;border-top:1px solid #333;font-size:11px;color:#666;">
    Silent Evidence &bull; <a href="{{SITE_URL}}/settings" style="color:#888;">Manage notifications</a>
  </div>
</div>`;

  const content: Record<string, string> = {
    email_welcome:
      '<h2 style="color:#f87171;">Welcome to Silent Evidence!</h2><p>Thanks for joining, {{USERNAME}}. Start reading the latest horror stories now.</p><a href="{{SITE_URL}}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;">Browse Stories</a>',
    email_newsletter:
      '<h2 style="color:#f87171;">This Week on Silent Evidence</h2><p>Here are the top stories from this week:</p>{{STORIES}}',
    email_digest:
      '<h2 style="color:#f87171;">Recent Comments Digest</h2><p>Here\'s what people are saying:</p>{{COMMENTS}}',
    email_follow_notify:
      '<h2 style="color:#f87171;">{{AUTHOR}} published a new story</h2><p>{{STORY_TITLE}}</p><a href="{{STORY_URL}}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;">Read Now</a>',
  };

  return base.replace('{{CONTENT}}', content[key] ?? '<p>{{CONTENT}}</p>');
}
