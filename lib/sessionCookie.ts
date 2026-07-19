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

/**
 * signUserId — produces the HMAC signature for a given user id.
 */
export async function signUserId(id: string | number): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(String(id)));
  return toBase64Url(new Uint8Array(sig));
}

/**
 * verifyUserId — returns true only if `sig` is the signature we produced for `id`.
 * Uses crypto.subtle.verify, which compares in constant time.
 */
export async function verifyUserId(id: string | undefined, sig: string | undefined): Promise<boolean> {
  if (!id || !sig) return false;
  let sigBytes: Uint8Array;
  try {
    sigBytes = fromBase64Url(sig);
  } catch {
    return false;
  }
  try {
    const key = await getKey();
    return await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, encoder.encode(String(id)));
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
 * setSessionCookies — log a user in by setting BOTH the userId cookie and its
 * signature. Use this everywhere a session is created (login, register, 2FA,
 * OAuth callbacks) instead of setting the userId cookie directly.
 */
export async function setSessionCookies(res: NextResponse, id: string | number): Promise<void> {
  const sig = await signUserId(id);
  res.cookies.set(SESSION_COOKIE, String(id), COOKIE_OPTIONS);
  res.cookies.set(SESSION_SIG_COOKIE, sig, COOKIE_OPTIONS);
}

/**
 * clearSessionCookies — log a user out by clearing both cookies.
 */
export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(SESSION_SIG_COOKIE, '', { maxAge: 0, path: '/' });
}
