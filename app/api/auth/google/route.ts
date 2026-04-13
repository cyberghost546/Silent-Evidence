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

// ── GET handler ───────────────────────────────────────────────────────────────
// This function runs whenever a GET request is made to /api/auth/google.
// No parameters are needed — we only build a URL and redirect.
export async function GET() {
  // Read the Google OAuth Client ID from environment variables.
  // This is the public identifier for your Google Cloud project's OAuth app.
  // It is NOT a secret (it's visible in URLs), but it must be set correctly.
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // If the environment variable isn't set, the OAuth flow can't work.
  // Return a 503 Service Unavailable to signal misconfiguration.
  if (!clientId) return new Response('Google OAuth not configured.', { status: 503 });

  // Build the query string parameters that Google's authorization endpoint expects.
  // URLSearchParams automatically handles URL-encoding of special characters.
  const params = new URLSearchParams({
    // client_id — identifies which Google Cloud project is requesting access
    client_id: clientId,

    // redirect_uri — where Google should send the user after they authorize.
    // This MUST exactly match a URI registered in your Google Cloud Console.
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`,

    // response_type: 'code' — tells Google to return an authorization code,
    // not an access token directly (more secure; the code exchange happens server-side)
    response_type: 'code',

    // scope — what user data we're requesting permission to access:
    // openid   — enables OpenID Connect so we get a JWT with user info
    // email    — we want the user's email address
    // profile  — we want the user's name and profile picture
    scope: 'openid email profile',

    // access_type: 'offline' — request a refresh token so we can renew access
    // without requiring the user to re-authorize (useful for long sessions)
    access_type: 'offline',

    // prompt: 'select_account' — always show the account chooser even if the user
    // is already signed into one Google account in the browser
    prompt: 'select_account',
  });

  // Redirect the browser to Google's OAuth authorization endpoint.
  // The ?params string tells Google all the details about our request.
  // Google will then show the login/consent page to the user.
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
