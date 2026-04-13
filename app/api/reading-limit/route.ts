// app/api/reading-limit/route.ts
// GET /api/reading-limit?storyId=123
// Returns the user's current reading limit status for the free tier paywall.
// Called by the story page to determine whether to show full content or the upsell modal.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkReadingLimit, FREE_MONTHLY_LIMIT } from '@/lib/readingLimit';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const storyId = Number(req.nextUrl.searchParams.get('storyId'));
  if (!storyId) {
    return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
  }

  const result = await checkReadingLimit(userId, storyId);

  return NextResponse.json({
    ...result,
    limit: FREE_MONTHLY_LIMIT,
  });
}
