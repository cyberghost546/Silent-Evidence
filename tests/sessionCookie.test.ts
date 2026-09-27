// tests/sessionCookie.test.ts
// Tests for the signed-session crypto in lib/sessionCookie.ts.
//
// The security property under test: a session cookie is valid only for the exact
// (userId, sessionVersion) pair it was signed for. This is what lets the app
// revoke sessions by bumping the version — a stale cookie still has a valid
// signature for its OLD version, but verifying it against the NEW version fails.

import { describe, it, expect, beforeAll } from 'vitest';
import { signSession, verifyUserId } from '@/lib/sessionCookie';

beforeAll(() => {
  process.env.SESSION_SECRET ??= 'test-session-secret-at-least-32-chars-long';
});

describe('signSession / verifyUserId', () => {
  it('accepts a signature for the same id and version', async () => {
    const sig = await signSession(42, 3);
    expect(await verifyUserId('42', sig, '3')).toBe(true);
  });

  it('rejects a signature when the version has moved on (revocation)', async () => {
    // Cookie was signed at version 3...
    const sig = await signSession(42, 3);
    // ...but the account is now at version 4. The stale cookie must fail.
    expect(await verifyUserId('42', sig, '4')).toBe(false);
  });

  it('rejects a signature reused for a different user id', async () => {
    const sig = await signSession(42, 0);
    expect(await verifyUserId('43', sig, '0')).toBe(false);
  });

  it('rejects a forged version cookie', async () => {
    // An attacker with a valid v3 cookie tries to pass off version 99 to dodge a
    // freshness check. Because version is bound into the signature, this fails.
    const sig = await signSession(42, 3);
    expect(await verifyUserId('42', sig, '99')).toBe(false);
  });

  it('rejects when the version is missing entirely (legacy cookie shape)', async () => {
    const sig = await signSession(42, 0);
    expect(await verifyUserId('42', sig, undefined)).toBe(false);
  });

  it('rejects a garbage signature', async () => {
    expect(await verifyUserId('42', 'not-a-real-sig', '0')).toBe(false);
  });

  it('rejects empty inputs', async () => {
    const sig = await signSession(1, 0);
    expect(await verifyUserId(undefined, sig, '0')).toBe(false);
    expect(await verifyUserId('1', undefined, '0')).toBe(false);
  });
});
