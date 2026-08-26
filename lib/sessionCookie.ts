// lib/sessionCookie.ts
// ─────────────────────────────────────────────────────────────────────────────
// Signs and verifies the session so the `userId` cookie cannot be forged.
//
// Previously the session was a bare `userId=<number>` cookie. Because that value
// was never signed, anyone could open their browser dev-tools, set userId=1, and
// instantly impersonate that account (including an admin). This module fixes that
// by issuing a second cookie, `userId_sig`, containing an HMAC-SHA256 of the
// userId. The signature is verified centrally in middleware.ts on every request,
// so a cookie whose signature doesn't match a value we actually signed is treated
// as anonymous — the forged `userId` is stripped before any route handler sees it.
//
// The `userId` cookie itself stays a plain integer, so the ~130 route handlers
// that read it with `Number(cookie)` keep working unchanged.
//
// Implementation uses the Web Crypto API (crypto.subtle), which is available in
// BOTH the Edge runtime (middleware) and the Node runtime (route handlers), so a
// single implementation works everywhere.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextResponse } from 'next/server';

export const SESSION_COOKIE = 'userId';
export const SESSION_SIG_COOKIE = 'userId_sig';
// Carries the account's sessionVersion at the time the session was issued. It is
// bound into the signature (see signSession), so it cannot be forged — an
// attacker cannot bump it to match a rotated server-side version. Comparing this
// against the live DB value (in getSessionUser) is what makes "log out everywhere"
// and break-glass recovery actually evict a session, rather than merely bumping a
// counter nothing reads.
export const SESSION_VER_COOKIE = 'userId_v';

const encoder = new TextEncoder();

// Cache the imported HMAC key per isolate so we don't re-import on every request.
let cachedKey: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 16) {
      throw new Error(
        'SESSION_SECRET is missing or too short. Set a random value (>= 32 chars) ' +
          'in your environment — sessions cannot be signed without it.'
      );
    }
    cachedKey = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }
  return cachedKey;
}

// ── base64url helpers (no Buffer — works in Edge and Node) ────────────────────
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// The signed payload binds the user id to the session version, so a valid
// signature vouches for both. Kept in one helper so signing and verifying can
// never disagree about the format.
function sessionPayload(id: string | number, version: string | number): string {
  return `${id}.${version}`;
}

/**
 * signSession — produces the HMAC signature covering both the user id and the
 * session version. Rotating the version (logout-all, break-glass) changes what a
 * fresh cookie must be signed over, so previously-issued cookies stop verifying
 * once the DB check compares versions.
 */
export async function signSession(id: string | number, version: string | number): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(sessionPayload(id, version)));
  return toBase64Url(new Uint8Array(sig));
}

/**
 * verifyUserId — returns true only if `sig` is the signature we produced for this
 * (id, version) pair. Uses crypto.subtle.verify, which compares in constant time.
 *
 * This proves the cookie is authentic and untampered. It does NOT prove the
 * version is still current — that freshness check requires the database and lives
 * in getSessionUser. Middleware uses this for integrity; the session helper adds
 * the freshness comparison.
 */
export async function verifyUserId(
  id: string | undefined,
  sig: string | undefined,
  version: string | undefined,
): Promise<boolean> {
  if (!id || !sig || version === undefined) return false;
  let sigBytes: Uint8Array;
  try {
    sigBytes = fromBase64Url(sig);
  } catch {
    return false;
  }
  try {
    const key = await getKey();
    return await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, encoder.encode(sessionPayload(id, version)));
  } catch {
    return false;
  }
}

// ── Cookie options — shared by every place that sets the session ──────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * setSessionCookies — log a user in by setting the userId cookie, the version
 * cookie, and the signature that binds them. Use this everywhere a session is
 * created (login, register, 2FA, OAuth callbacks) instead of setting the userId
 * cookie directly.
 *
 * `version` must be the account's current sessionVersion. Callers that only have
 * the user id should use createSession() in lib/session.ts, which reads the
 * version from the database first. It defaults to 0 so an accidental omission
 * fails safe as "oldest version" rather than throwing.
 */
export async function setSessionCookies(
  res: NextResponse,
  id: string | number,
  version: string | number = 0,
): Promise<void> {
  const sig = await signSession(id, version);
  res.cookies.set(SESSION_COOKIE, String(id), COOKIE_OPTIONS);
  res.cookies.set(SESSION_VER_COOKIE, String(version), COOKIE_OPTIONS);
  res.cookies.set(SESSION_SIG_COOKIE, sig, COOKIE_OPTIONS);
}

/**
 * clearSessionCookies — log a user out by clearing all session cookies.
 */
export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(SESSION_VER_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(SESSION_SIG_COOKIE, '', { maxAge: 0, path: '/' });
}
