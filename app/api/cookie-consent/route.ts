// POST /api/cookie-consent
// Records the visitor's cookie preference in the database.
// Called by the CookieBanner component when the user makes a choice.

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { anonymizeIp } from '@/lib/rateLimit';

const VALID_CHOICES = ['all', 'essential', 'rejected'] as const;
type Choice = (typeof VALID_CHOICES)[number];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const choice: Choice = VALID_CHOICES.includes(body.choice) ? body.choice : 'essential';
  const analytics  = choice === 'all';
  const marketing  = choice === 'all';

  // Grab the user id from the session cookie (null for guests)
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Anonymise IP before storing (last octet removed)
  const headersList = await headers();
  const rawIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headersList.get('x-real-ip')
    ?? 'unknown';
  const ip = anonymizeIp(rawIp);
  const userAgent = headersList.get('user-agent') ?? null;

  await prisma.cookieConsent.create({
    data: { userId, choice, analytics, marketing, ip, userAgent },
  });

  return NextResponse.json({ ok: true });
}

// GET /api/cookie-consent — admin endpoint: returns aggregated stats
export async function GET() {
  const [total, byChoice, recent] = await Promise.all([
    prisma.cookieConsent.count(),
    prisma.cookieConsent.groupBy({
      by: ['choice'],
      _count: { choice: true },
    }),
    prisma.cookieConsent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        choice: true,
        analytics: true,
        marketing: true,
        ip: true,
        createdAt: true,
      },
    }),
  ]);

  const counts = Object.fromEntries(byChoice.map(r => [r.choice, r._count.choice]));

  return NextResponse.json({ total, counts, recent });
}
