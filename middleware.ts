// middleware.ts
// Edge-level protection for /admin/* routes.
// Runs before any layout or page code — redirects unauthenticated users
// to /login instantly without hitting the database.
// The full DB-level role check still happens inside app/admin/layout.tsx;
// this just stops the round-trip for users who aren't even logged in.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (pathname.startsWith('/admin')) {
    const userId = request.cookies.get('userId')?.value;

    // No session cookie → redirect to login immediately
    if (!userId || userId === '0') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      // Preserve the intended destination so login can redirect back
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Only run this middleware on /admin/* paths — skip all other routes
export const config = {
  matcher: ['/admin/:path*'],
};
