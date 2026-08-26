// app/.well-known/security.txt/route.ts
//
// Serves /.well-known/security.txt (RFC 9116) — the standard, machine- and
// human-readable place a security researcher looks to report a vulnerability.
// Having one signals you welcome disclosure and tells finders exactly where to
// go, instead of them guessing or posting publicly.
//
// TODO before relying on this: set the Contact address and the canonical domain
// below to real values, and refresh Expires roughly yearly (RFC 9116 requires an
// Expires date; a stale one should be renewed).

import { NextResponse } from 'next/server';

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://silentevidence.com').replace(/\/$/, '');

export async function GET() {
  // Expires one year out. RFC 9116 mandates an Expires field; keep it fresh.
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const body = [
    '# Security contact for Silent Evidence.',
    '# If you have found a vulnerability, please tell us here before disclosing publicly.',
    '',
    'Contact: mailto:security@yourdomain',
    `Expires: ${expires}`,
    'Preferred-Languages: en',
    `Canonical: ${BASE_URL}/.well-known/security.txt`,
    `Policy: ${BASE_URL}/copyright`,
    '',
  ].join('\n');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Cache for a day; the content is stable apart from the rolling Expires.
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
