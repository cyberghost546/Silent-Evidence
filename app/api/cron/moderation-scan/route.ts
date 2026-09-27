// app/api/cron/moderation-scan/route.ts
//
// The moderation bot: on a schedule, scans recent unflagged comments with the
// AI toxicity check and flags anything that looks like a real-world policy
// breach (hate speech, doxxing, threats, spam) for a human moderator to review.
//
// It FLAGS, it does not remove — flagged comments surface in the admin moderation
// view, where a person decides. That keeps a false positive from silently
// deleting a legitimate comment, and keeps removal decisions (which owe a
// statement of reasons) with a human.
//
// COST CONTROL: each comment is one model call, so a run is capped at MAX_SCAN
// comments. New comments not reached this run are picked up next run.
//
// AUTH: protected by CRON_SECRET.
//   GET /api/cron/moderation-scan
//   Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkToxicity } from '@/lib/toxicityCheck';

// How far back to look, and how many to check per run.
const LOOKBACK_HOURS = 24;
const MAX_SCAN = 40;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const comments = await prisma.comment.findMany({
      where: { flagged: false, createdAt: { gt: since } },
      orderBy: { createdAt: 'desc' },
      take: MAX_SCAN,
      select: { id: true, content: true },
    });

    let flagged = 0;
    for (const c of comments) {
      const result = await checkToxicity(c.content);
      if (result.flagged) {
        await prisma.comment.update({ where: { id: c.id }, data: { flagged: true } });
        flagged++;
        console.log(`[cron/moderation-scan] flagged comment ${c.id}: ${result.reason ?? 'policy'}`);
      }
    }

    return NextResponse.json({ ok: true, scanned: comments.length, flagged });
  } catch (err) {
    console.error('[cron/moderation-scan]', err);
    return NextResponse.json({ error: 'Moderation scan failed.' }, { status: 500 });
  }
}
