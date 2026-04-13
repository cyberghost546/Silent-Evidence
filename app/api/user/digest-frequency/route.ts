// app/api/user/digest-frequency/route.ts
// PATCH — updates the logged-in user's digest email frequency.
// Accepted values: "DAILY", "WEEKLY", "NEVER"

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { unauthorized, zodError, serverError } from '@/lib/apiError';

// ── Zod schema — only the three allowed frequency values ─────────────────────
const DigestFrequencySchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'NEVER'], {
    error: () => 'Frequency must be DAILY, WEEKLY, or NEVER.',
  }),
});

export async function PATCH(req: Request) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return unauthorized();

  try {
    // ── Input validation ─────────────────────────────────────────────────────
    const body = await req.json();
    const parsed = DigestFrequencySchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const { frequency } = parsed.data;

    // ── Update the user record ────────────────────────────────────────────────
    await prisma.user.update({
      where: { id: userId },
      data: { digestFrequency: frequency },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[digest-frequency]', err);
    return serverError();
  }
}
