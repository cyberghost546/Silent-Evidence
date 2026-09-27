// PATCH /api/user/appearance — save profileTheme and avatarBorder for the current user.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { unauthorized, serverError } from '@/lib/apiError';
import { THEMES, BORDERS } from '@/app/lib/themes';
import { hasPremiumAccess } from '@/lib/premiumCheck';

const VALID_THEMES = Object.keys(THEMES);
const VALID_BORDERS = Object.keys(BORDERS);

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = Number(cookieStore.get('userId')?.value ?? 0);
    if (!userId) return unauthorized();

    // Admins and premium subscribers can change cosmetics
    if (!(await hasPremiumAccess(userId))) {
      return NextResponse.json({ error: 'Premium subscription required.' }, { status: 403 });
    }

    const { profileTheme, avatarBorder } = await req.json();
    const theme = VALID_THEMES.includes(profileTheme) ? profileTheme : 'default';
    const border = VALID_BORDERS.includes(avatarBorder) ? avatarBorder : 'none';

    await prisma.profile.upsert({
      where: { userId },
      update: { profileTheme: theme, avatarBorder: border },
      create: { userId, profileTheme: theme, avatarBorder: border },
    });

    return NextResponse.json({ ok: true, profileTheme: theme, avatarBorder: border });
  } catch (err) {
    console.error('[PATCH /api/user/appearance]', err);
    return serverError();
  }
}
