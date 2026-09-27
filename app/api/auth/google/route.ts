// app/api/auth/google/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles GET /api/auth/google — the first step of the Google OAuth flow.
//
// How OAuth works (simplified):
//   1. User clicks "Sign in with Google" on your site.
//   2. Your site redirects the user to Google's authorization server (this file).
//   3. Google shows a "choose your account" screen.
//   4. Google redirects the user back to your callback URL with a one-time "code".
//   5. Your callback route exchanges the code for an access token (see callback/route.ts).
//
// This endpoint builds the correct redirect URL to Google and sends the browser there.
// ─────────────────────────────────────────────────────────────────────────────

// Import the redirect() function from Next.js navigation.
// In a Route Handler, redirect() throws a special error that Next.js catches
// and converts into an HTTP 307 redirect response automatically.
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// ── GET handler ───────────────────────────────────────────────────────────────
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return new Response('Google OAuth not configured.', { status: 503 });

  // Generate a random state token to prevent OAuth CSRF attacks.
  // Stored in a short-lived httpOnly cookie; verified in the callback.
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);

  // Store state in a short-lived cookie so the callback can verify it.
  res.cookies.set('oauth_state_google', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return res;
}
