// app/api/user/change-password/route.ts
// POST — verifies current password, hashes and saves the new one

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  // Fetch the stored hash to verify the current password
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

  // Hash the new password before saving
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
