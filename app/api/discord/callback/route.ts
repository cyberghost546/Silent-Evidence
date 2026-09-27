// ============================================================
//  app/api/discord/callback/route.ts
//
//  GET /api/discord/callback
//
//  This is the OAuth2 redirect endpoint that Discord calls after
//  a user clicks "Authorize" on Discord's consent screen.
//
//  The flow is:
//    1. Discord redirects here with a short-lived `code` in the URL.
//    2. We exchange that code for a long-lived access token.
//    3. We use the access token to fetch the user's Discord profile.
//    4. We save the Discord ID and tokens to our database.
//    5. We add the user to our Discord server automatically.
//    6. If the user has an active subscription, we grant them
//       the Premium Discord role.
//    7. We redirect the user back to /settings with a success flag.
//
//  Required environment variables:
//    NEXT_PUBLIC_BASE_URL       — e.g. https://yourdomain.com
//    DISCORD_CLIENT_ID          — from the Discord Developer Portal
//    DISCORD_CLIENT_SECRET      — from the Discord Developer Portal
//    DISCORD_GUILD_ID           — your Discord server's ID
//    DISCORD_BOT_TOKEN          — your bot's token (must be in the server)
//    DISCORD_PREMIUM_ROLE_ID    — ID of the "Premium" role in your server
// ============================================================

// Import NextRequest to type the incoming request (lets us access req.url)
import { NextRequest, NextResponse } from 'next/server';

// Import Prisma client for database reads and writes
import { prisma } from '@/lib/prisma';

// Import a shared error helper that returns a 500 JSON response
import { serverError } from '@/lib/apiError';

// Build the full redirect URI that must match what is registered in the Discord Portal.
// We read the base URL from an environment variable so this works in production and locally.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// This must exactly match the "Redirect URI" configured in the Discord Developer Portal.
// Discord will refuse to exchange the code if it doesn't match.
const REDIRECT_URI = `${BASE_URL}/api/discord/callback`;

// The versioned base URL for all Discord REST API calls
const DISCORD_API = 'https://discord.com/api/v10';

// ── GET handler ───────────────────────────────────────────────────────────────
// Next.js calls this function when Discord redirects the user back here.
// req — the incoming request, which contains the OAuth `code` and `state` query params
export async function GET(req: NextRequest) {
  // Parse the URL so we can read the query string parameters Discord appended
  const { searchParams } = new URL(req.url);

  // `code` is the short-lived authorization code Discord sends us.
  // It can only be used once and expires quickly.
  const code = searchParams.get('code');

  // `state` is the value we sent when starting the OAuth flow (in /connect).
  // It encodes the userId so we know who to update in our database.
  const state = searchParams.get('state');

  // If either required parameter is missing, redirect back to settings with an error flag
  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/settings?discord=error`);
  }

  try {
    // Decode the base64-encoded state string back into a JavaScript object.
    // Buffer.from(state, 'base64') converts the base64 string to a Buffer.
    // .toString() converts the Buffer to a UTF-8 string.
    // JSON.parse() converts the string to an object like { userId: 42 }.
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // ── Step 1: Exchange the authorization code for an access token ───────
    // This is a POST request to Discord's token endpoint.
    // We use x-www-form-urlencoded format because that is what Discord requires.
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: {
        // Tell Discord we are sending form data, not JSON
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        // Our app's client ID from the Discord Developer Portal
        client_id: process.env.DISCORD_CLIENT_ID!,
        // Our app's secret — never expose this to the browser
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        // Tells Discord we are exchanging a code (not refreshing a token)
        grant_type: 'authorization_code',
        // The one-time code Discord just gave us
        code,
        // Must match our registered redirect URI exactly
        redirect_uri: REDIRECT_URI,
      }),
    });

    // Parse the token response JSON — it contains access_token and refresh_token
    const tokenData = await tokenRes.json();

    // If Discord didn't send back an access_token the exchange failed
    if (!tokenData.access_token) {
      // Redirect back to settings with an error flag so the UI can show a message
      return NextResponse.redirect(`${BASE_URL}/settings?discord=error`);
    }

    // ── Step 2: Fetch the user's Discord profile using the access token ───
    // The @me endpoint returns the authenticated user's Discord account details
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: {
        // Authenticate as the user by passing their access token as a Bearer token
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    // Parse the Discord user profile JSON
    const discordUser = await userRes.json();

    // ── Step 3: Save the Discord credentials to our database ──────────────
    // We update the user row so they can see their connected Discord account
    // in settings and so we can manage their server role automatically.
    await prisma.user.update({
      where: {
        // Target the specific user who started the OAuth flow
        id: userId,
      },
      data: {
        // Discord's numeric user ID (snowflake) — uniquely identifies the Discord account
        discordId: discordUser.id,
        // Store the username for display in the settings page
        discordUsername: `${discordUser.username}`,
        // The access token lets us make API calls on behalf of this Discord user
        discordAccessToken: tokenData.access_token,
        // The refresh token can be used to get a new access token when the current one expires.
        // ?? null means we store null if Discord didn't send a refresh token.
        discordRefreshToken: tokenData.refresh_token ?? null,
      },
    });

    // ── Step 4: Add user to Discord server and grant Premium role ─────────
    // These operations require the Discord bot to be in the server with
    // the correct permissions.

    // Read the server/guild ID from environment variables
    const guildId = process.env.DISCORD_GUILD_ID;
    // Read the bot token from environment variables (must NOT be exposed to the client)
    const botToken = process.env.DISCORD_BOT_TOKEN;
    // Read the ID of the role we assign to premium subscribers
    const premiumRoleId = process.env.DISCORD_PREMIUM_ROLE_ID;

    // Only proceed if both the guild ID and bot token are configured.
    // If they're not set up, we skip this step silently — the account is still connected.
    if (guildId && botToken) {
      // Send a PUT request to add this Discord user as a member of our server.
      // Discord's "Add Guild Member" endpoint requires the guilds.join OAuth scope
      // (which we requested in /connect) and the user's access token.
      await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUser.id}`, {
        method: 'PUT',
        headers: {
          // Authenticate as our bot (not as the user) for this server management action
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Pass the user's access token so Discord can link the OAuth account to the invite
          access_token: tokenData.access_token,
        }),
      });

      // Check whether this site user has an active paid subscription
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        // We only need the status field — no need to fetch payment details etc.
        select: { status: true },
      });

      // If the user is a paying subscriber AND we have a Premium role ID configured,
      // grant that role on Discord so they get access to premium channels
      if (subscription?.status === 'active' && premiumRoleId) {
        // PUT to this endpoint adds the role to the user without removing other roles
        await fetch(
          `${DISCORD_API}/guilds/${guildId}/members/${discordUser.id}/roles/${premiumRoleId}`,
          {
            method: 'PUT',
            headers: {
              // Bot token required for role management
              Authorization: `Bot ${botToken}`,
            },
          }
        );
      }
    }

    // All steps complete — redirect back to settings with a success flag
    return NextResponse.redirect(`${BASE_URL}/settings?discord=connected`);
  } catch (err) {
    // Log the error on the server so we can debug it (won't be visible to the user)
    console.error('[discord-callback]', err);
    // Return a generic 500 Internal Server Error response
    return serverError();
  }
}
