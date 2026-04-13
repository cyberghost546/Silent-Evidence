// app/api/auth/microsoft/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles GET /api/auth/microsoft — the first step of the Microsoft OAuth flow.
//
// How this works (same pattern as Google OAuth):
//   1. User clicks "Sign in with Microsoft" on your site.
//   2. Your site redirects to Microsoft's authorization server (this file does that).
//   3. Microsoft shows a login / consent screen.
//   4. Microsoft redirects back to your callback URL with a one-time "code".
//   5. Your callback route exchanges the code for an access token.
//
// This endpoint builds the Microsoft authorization URL and redirects the browser there.
// ─────────────────────────────────────────────────────────────────────────────

// Import redirect() from Next.js navigation.
// In a Route Handler, this throws a special Next.js redirect which becomes
// an HTTP 307 redirect response — no need to manually build a NextResponse.
import { redirect } from 'next/navigation';

// ── GET handler ───────────────────────────────────────────────────────────────
// This function runs whenever a GET request is made to /api/auth/microsoft.
// No parameters are needed because we only redirect.
export async function GET() {
  // Read the Microsoft OAuth Client ID from environment variables.
  // This is the "Application (client) ID" from your Azure AD app registration.
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  // If the environment variable isn't configured, the OAuth flow can't work.
  // Return 503 Service Unavailable to indicate a server-side configuration problem.
  if (!clientId) return new Response('Microsoft OAuth not configured.', { status: 503 });

  // Build the query parameters that Microsoft's authorization endpoint expects.
  // URLSearchParams handles URL-encoding of any special characters automatically.
  const params = new URLSearchParams({
    // client_id — identifies which Azure AD application is requesting access
    client_id: clientId,

    // redirect_uri — where Microsoft should redirect the user after authorization.
    // This must exactly match a Redirect URI registered in your Azure app.
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/microsoft/callback`,

    // response_type: 'code' — request an authorization code rather than a token directly.
    // The code is then exchanged server-side, keeping the client_secret secure.
    response_type: 'code',

    // scope — what permissions we're requesting:
    // openid      — enables OpenID Connect (gives us a JWT with user info)
    // email       — the user's email address
    // profile     — the user's display name and other basic info
    // User.Read   — Microsoft Graph API permission to read the signed-in user's profile
    scope: 'openid email profile User.Read',

    // response_mode: 'query' — tells Microsoft to append the authorization code to
    // the redirect URL as a query parameter (e.g. ?code=...) rather than using
    // a form POST or fragment. This is the simplest mode for server-side flows.
    response_mode: 'query',
  });

  // Redirect the browser to Microsoft's OAuth authorization endpoint.
  // 'common' in the URL means this works for both personal Microsoft accounts
  // (outlook.com, hotmail.com) and work/school accounts (Azure AD tenants).
  redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
}
