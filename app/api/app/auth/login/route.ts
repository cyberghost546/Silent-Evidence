// app/api/app/auth/login/route.ts
// POST — mobile app login endpoint.
// Returns userId + username in the body (instead of a cookie) so the
// app can store them in memory and send them as the x-user-id header.

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Reject if user doesn't exist or password is wrong
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  // Return the userId and username so the app can store them
  return NextResponse.json({ userId: user.id, username: user.username });
}
