// app/api/auth/microsoft/callback/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles GET /api/auth/microsoft/callback — the second step of Microsoft OAuth.
//
// After the user approves access on Microsoft's consent screen, Microsoft redirects
// the browser here with a one-time authorization "code" in the URL query string.
// This route:
//   1. Reads the "code" from the URL
//   2. Exchanges it with Microsoft for an access token (server-to-server)
//   3. Uses the access token to fetch the user's profile from Microsoft Graph API
//   4. Finds or creates a matching user record in our own database
//   5. Sets the session cookie and redirects the user to the homepage
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request with URL helpers) and NextResponse (for redirects)
import { NextRequest, NextResponse } from 'next/server';

// Import the Prisma database client to find or create user records
import { prisma } from '@/lib/prisma';

// ── GET handler ───────────────────────────────────────────────────────────────
// This function runs when Microsoft redirects the browser back to our callback URL.
// "req" contains the URL with the authorization code as a query parameter.
export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (!code) return NextResponse.redirect(new URL('/login?error=microsoft', req.url));

  // Verify the state parameter matches what we stored in the cookie.
  // This prevents OAuth CSRF attacks.
  const storedState = req.cookies.get('oauth_state_microsoft')?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=microsoft', req.url));
  }

  // Read the base URL for our site from environment variables.
  // The ! asserts the variable is definitely defined (TypeScript non-null assertion).
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  // ── Step 1: Exchange the authorization code for an access token ───────────
  // POST to Microsoft's token endpoint. Microsoft returns an access_token
  // we can use to call the Microsoft Graph API on the user's behalf.
  // This is server-to-server so the client_secret is never visible to the browser.
  const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,                                                      // the one-time authorization code
      client_id: process.env.MICROSOFT_CLIENT_ID!,              // our Azure app's public ID
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,      // our Azure app's private secret
      redirect_uri: `${baseUrl}/api/auth/microsoft/callback`,   // must match the registered URI
      grant_type: 'authorization_code',                         // specifies the OAuth exchange type
    }),
  });

  // Parse the token response from Microsoft
  const tokens = await tokenRes.json();

  // If Microsoft didn't return an access token, something went wrong — send back to login
  if (!tokens.access_token) return NextResponse.redirect(new URL('/login?error=microsoft', req.url));

  // ── Step 2: Fetch the user's profile from Microsoft Graph ─────────────────
  // Use the access token to call the Microsoft Graph API and get the user's details.
  // $select limits the response to only the fields we need, reducing payload size.
  // displayName — the user's full name
  // mail        — the user's primary email address (may be null for some account types)
  // userPrincipalName — the user's login name (often an email; fallback when mail is null)
  const userRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }, // pass access token as Bearer
  });

  // Parse the JSON response from Microsoft Graph
  const msUser = await userRes.json();

  // Extract the email — 'mail' is the primary email, but some Microsoft accounts
  // (especially school accounts) only have a 'userPrincipalName', so we fall back to that.
  const email = msUser.mail ?? msUser.userPrincipalName;

  // Extract the display name and ensure it's a string (never undefined/null)
  const name: string = msUser.displayName ?? '';

  // If we couldn't get an email from Microsoft, we can't create an account — abort
  if (!email) return NextResponse.redirect(new URL('/login?error=microsoft', req.url));

  // ── Step 3: Find or create the user in our database ───────────────────────
  // Check whether we already have an account registered with this email
  let user = await prisma.user.findUnique({ where: { email } });

  // If no user exists, create a new one
  if (!user) {
    // Derive a base username from the Microsoft display name.
    // .toLowerCase() normalizes casing.
    // .replace(/[^a-z0-9]/g, '') removes spaces, hyphens, and other disallowed characters.
    // If the name is empty after stripping, fall back to the email prefix (before the @).
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '') || email.split('@')[0];

    // Start with the base username and keep trying with numeric suffixes
    // until we find one that isn't already taken
    let username = base;
    let i = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      // Append the counter and increment for the next iteration if still taken
      username = `${base}${i++}`;
    }

    // Create the user record in the database.
    // password: '' because Microsoft OAuth users sign in through Microsoft,
    // not with a local password — we never need to compare a password for them.
    // Unlike the Google callback, we don't have a profile picture URL from Microsoft
    // Graph by default, so no profile record is created here.
    user = await prisma.user.create({
      data: {
        email,
        username,
        password: '', // no password for OAuth users
      },
    });
  }

  // ── Step 4: Set cookie and redirect home ──────────────────────────────────
  // Build a redirect response that sends the browser to the homepage
  const res = NextResponse.redirect(new URL('/', req.url));

  // Set the session cookie so the user is logged in from this point forward.
  // httpOnly: true — not readable by browser JavaScript (XSS protection).
  // path: '/'      — cookie is sent on every request to the site.
  // maxAge: 7 days — session lasts for one week.
  // sameSite: 'lax' — prevents cross-site request forgery while allowing navigation.
  res.cookies.set('userId', String(user.id), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // Return the redirect response — the browser stores the cookie and navigates to '/'
  return res;
}
