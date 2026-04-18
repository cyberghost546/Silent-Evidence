// app/api/auth/microsoft/route.ts
// Handles GET /api/auth/microsoft — step 1 of the Microsoft OAuth flow.
// Generates a CSRF state token, stores it in a cookie, then redirects to Microsoft.

import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) return new Response('Microsoft OAuth not configured.', { status: 503 });

  // Generate a random state token to prevent OAuth CSRF attacks.
  // Stored in a short-lived httpOnly cookie; verified in the callback.
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/microsoft/callback`,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    response_mode: 'query',
    state,
  });

  const res = NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  );

  res.cookies.set('oauth_state_microsoft', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return res;
}
