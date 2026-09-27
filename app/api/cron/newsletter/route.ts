// app/api/cron/newsletter/route.ts
// Vercel Cron endpoint — fires every Monday at 9 AM UTC (configured in vercel.json).
// Sends the weekly horror digest to all subscribed users.
//
// Protected by CRON_SECRET — Vercel passes this as the Authorization header.
// Without it, anyone could trigger mass emails by hitting this URL.

import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklyNewsletter } from '@/lib/sendNewsletter';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SMTP_HOST) {
    return NextResponse.json({ error: 'SMTP not configured' }, { status: 503 });
  }

  try {
    const result = await sendWeeklyNewsletter();
    console.log('[cron/newsletter]', result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/newsletter] failed:', err);
    return NextResponse.json({ error: 'Newsletter send failed' }, { status: 500 });
  }
}
