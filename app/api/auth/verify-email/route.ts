// app/api/auth/verify-email/route.ts
// GET /api/auth/verify-email?token=<hex>
//
// Called when a user clicks the verification link in their welcome email.
// Marks the user's emailVerified flag as true and redirects to the homepage.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/?verified=invalid', req.url));
  }

  // Look up the token — must exist, be unused, and not expired
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, emailVerified: true } } },
  });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/?verified=expired', req.url));
  }

  if (record.user.emailVerified) {
    // Already verified — just send them home
    return NextResponse.redirect(new URL('/?verified=already', req.url));
  }

  // Mark the account as verified and delete the token in one transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  return NextResponse.redirect(new URL('/?verified=success', req.url));
}
