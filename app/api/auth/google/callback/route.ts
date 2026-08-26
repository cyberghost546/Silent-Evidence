// app/api/auth/google/callback/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles GET /api/auth/google/callback — the second step of Google OAuth.
//
// After the user approves access on Google's consent screen, Google redirects
// the browser here with a one-time authorization "code" in the URL query string.
// This route:
//   1. Reads the "code" from the URL
//   2. Exchanges it with Google for an access token (server-to-server)
//   3. Uses the access token to fetch the user's profile from Google's API
//   4. Finds or creates a matching user record in our own database
//   5. Sets the session cookie and redirects the user to the homepage
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (for redirects)
import { NextRequest, NextResponse } from 'next/server';

// Import the Prisma database client to look up or create user records
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/session';

// ── GET handler ───────────────────────────────────────────────────────────────
// This function runs when Google redirects the browser back to our callback URL.
// "req" contains the URL with the authorization code in the query string.
export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (!code) return NextResponse.redirect(new URL('/login?error=google', req.url));

  // Verify the state parameter matches what we stored in the cookie.
  // This prevents OAuth CSRF — an attacker tricking a victim into completing
  // the attacker's own OAuth flow.
  const storedState = req.cookies.get('oauth_state_google')?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=google', req.url));
  }

  // Read the base URL for our site (e.g. "https://silentevidence.com")
  // The ! asserts this env variable is definitely set (TypeScript non-null assertion)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  // ── Step 1: Exchange the authorization code for tokens ────────────────────
  // We POST the code to Google's token endpoint. Google returns an access_token
  // (and optionally a refresh_token and id_token).
  // This exchange happens server-to-server so the client_secret is never exposed.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,                                               // the one-time code from the URL
      client_id: process.env.GOOGLE_CLIENT_ID!,          // our Google app's public ID
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,  // our Google app's private secret
      redirect_uri: `${baseUrl}/api/auth/google/callback`, // must match what we registered
      grant_type: 'authorization_code',                  // tells Google what kind of exchange this is
    }),
  });

  // Parse Google's JSON response to get the access token
  const tokens = await tokenRes.json();

  // If Google didn't return an access token, something failed — redirect to login with error
  if (!tokens.access_token) return NextResponse.redirect(new URL('/login?error=google', req.url));

  // ── Step 2: Fetch the user's profile from Google ─────────────────────────
  // Use the access token as a Bearer token to call Google's userinfo API.
  // This returns the user's email, name, and profile picture URL.
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }, // pass token in header
  });

  // Parse the JSON response containing the Google user's profile info
  const googleUser = await userRes.json();

  // Destructure the fields we care about from the Google profile
  // email   — the user's verified Google email address
  // name    — their display name (e.g. "Jane Smith")
  // picture — URL to their Google profile picture
  const { email, name, picture } = googleUser;

  // If Google didn't return an email (very rare but possible), abort with error
  if (!email) return NextResponse.redirect(new URL('/login?error=google', req.url));

  // ── Step 3: Find or create the user in our database ───────────────────────
  // Check if we already have a user with this email address
  let user = await prisma.user.findUnique({ where: { email } });

  // If no existing user was found, create a new account for them
  if (!user) {
    // Build a username from the Google display name, falling back to the email prefix.
    // .toLowerCase() normalizes the casing.
    // .replace(/[^a-z0-9]/g, '') strips everything except letters and digits —
    // removes spaces, hyphens, and other characters not allowed in our usernames.
    const base = (name ?? email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');

    // Start with the base username and append a number if it's already taken.
    // This loop keeps incrementing until it finds an available username.
    let username = base;
    let i = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      // Append the current counter value and increment for the next iteration
      username = `${base}${i++}`;
    }

    // Create the user record in the database.
    // password: '' because OAuth users don't have a local password — they always
    // sign in through Google, so we never need to check a password for them.
    // profile: if a picture URL was returned, create a linked Profile record with the avatar.
    // The undefined fallback means no profile record is created if there's no picture.
    user = await prisma.user.create({
      data: {
        email,
        username,
        password: '', // no password for OAuth users
        profile: picture ? { create: { avatar: picture } } : undefined,
      },
    });
  }

  // ── Step 4: Set cookie and redirect home ──────────────────────────────────
  // Build a redirect response pointing to the homepage
  const res = NextResponse.redirect(new URL('/', req.url));

  // Set the session cookie so the user is now logged in.
  // httpOnly: true — not readable by browser JavaScript (XSS protection).
  // path: '/'      — cookie is sent on every request to the site.
  // maxAge: 7 days — session lasts 1 week.
  // sameSite: 'lax' — CSRF protection while still allowing normal navigation.
  await createSession(res, user.id);

  return res;
}
