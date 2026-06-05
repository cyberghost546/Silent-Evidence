// app/api/csrf/route.ts
// GET — generates (or refreshes) a CSRF token, sets it as a non-httpOnly cookie,
// and returns it as JSON so client components can read it without parsing cookies.
//
// Called automatically by getCsrfToken() (lib/getCsrfToken.ts) when the csrf_token
// cookie is missing. Typically fires once per browser session.

import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';

export async function GET() {
  const token = await generateCsrfToken();
  return NextResponse.json({ token });
}
