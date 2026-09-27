// ============================================================
//  app/api/discord/connect/route.ts
//
//  GET /api/discord/connect
//
//  This is the starting point of the Discord OAuth2 flow.
//  When a user clicks "Connect Discord" in their settings,
//  the browser navigates here.  This endpoint builds the
//  Discord authorization URL and redirects the browser to it.
//
//  After the user approves on Discord's consent screen,
//  Discord redirects them to /api/discord/callback.
//
//  The `state` parameter we embed encodes the userId so the
//  callback knows which site account to update — this is a
//  standard OAuth2 security pattern to prevent CSRF attacks.
//
//  Required environment variables:
//    DISCORD_CLIENT_ID        — from the Discord Developer Portal
//    NEXT_PUBLIC_BASE_URL     — e.g. https://yourdomain.com
// ============================================================

// Import NextResponse so we can return redirect responses
import { NextResponse } from 'next/server';

// Import the unauthorized helper that returns a 401 JSON response
import { unauthorized } from '@/lib/apiError';

// Import the cookies helper so we can read the session cookie
import { cookies } from 'next/headers';

// Define the OAuth scopes we need Discord to grant:
//   identify   — lets us read the user's Discord username and ID
//   guilds.join — lets us add the user to our Discord server automatically
// Scopes in a URL must be space-separated but spaces must be URL-encoded as %20
const SCOPES = ['identify', 'guilds.join'].join('%20');

// ── GET handler ───────────────────────────────────────────────────────────────
// Redirects the logged-in user to Discord's OAuth2 authorization page.
export async function GET() {
  // Read all cookies from the request so we can check if the user is logged in
  const c = await cookies();

  // Extract the userId cookie value.
  // If there is no userId cookie (not logged in), || null ensures we get null not 0.
  const userId = Number(c.get('userId')?.value ?? 0) || null;

  // Only logged-in users should be able to connect their Discord account.
  // unauthorized() returns a 401 JSON response and stops execution.
  if (!userId) return unauthorized();

  // Read the Discord application client ID from environment variables.
  // This is the public ID found in the Discord Developer Portal — not a secret.
  const clientId = process.env.DISCORD_CLIENT_ID;

  // Build and URL-encode the redirect URI.
  // Discord will send the user back here after they approve or deny access.
  // encodeURIComponent ensures characters like ':' and '/' are safely encoded in the URL.
  const redirectUri = encodeURIComponent(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/discord/callback`
  );

  // If DISCORD_CLIENT_ID isn't configured, the integration isn't set up yet.
  // Return 503 Service Unavailable so the UI can show a friendly message.
  if (!clientId) {
    return NextResponse.json({ error: 'Discord integration is not configured.' }, { status: 503 });
  }

  // Encode the userId into the state parameter.
  // JSON.stringify({ userId }) → '{"userId":42}'
  // Buffer.from(...).toString('base64') → base64 string safe for URLs
  // The callback will decode this to find out which user to update.
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

  // Assemble the full Discord OAuth2 authorization URL with all required parameters.
  // When the user visits this URL, Discord shows them the consent screen.
  const discordUrl =
    `https://discord.com/api/oauth2/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` + // we want an authorization code, not an implicit token
    `&scope=${SCOPES}` + // the permissions we are requesting
    `&state=${state}`; // carries the userId through the redirect round-trip

  // Redirect the browser to Discord's consent screen.
  // Next.js will send a 307 Temporary Redirect response.
  return NextResponse.redirect(discordUrl);
}
