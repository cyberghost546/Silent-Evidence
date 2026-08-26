// tests/owner.test.ts
// Unit tests for the owner / last-admin protection logic in lib/owner.ts.
//
// These invariants are what stop the site from being locked out of its own admin
// panel — either by demoting the owner or by removing the final administrator —
// so they are worth testing in isolation from the routes that call them.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { checkOwnerProtection, isOwnerEmail } from '@/lib/owner';

const OWNER = 'owner@example.com';
const owner = { id: 1, email: OWNER, role: 'ADMIN' };
const admin2 = { id: 2, email: 'other-admin@example.com', role: 'ADMIN' };
const member = { id: 3, email: 'reader@example.com', role: 'USER' };

beforeEach(() => {
  process.env.OWNER_EMAIL = OWNER;
});
afterEach(() => {
  delete process.env.OWNER_EMAIL;
});

describe('isOwnerEmail', () => {
  it('matches the configured owner case-insensitively', () => {
    expect(isOwnerEmail(OWNER)).toBe(true);
    expect(isOwnerEmail('Owner@Example.com')).toBe(true);
    expect(isOwnerEmail('  owner@example.com  ')).toBe(true);
  });

  it('does not match other emails', () => {
    expect(isOwnerEmail('someone@example.com')).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
  });

  it('matches nobody when OWNER_EMAIL is unset', () => {
    delete process.env.OWNER_EMAIL;
    expect(isOwnerEmail(OWNER)).toBe(false);
  });
});

describe('checkOwnerProtection — owner account', () => {
  it('refuses to demote the owner from admin', () => {
    const r = checkOwnerProtection(owner, 'USER', 5);
    expect(r.allowed).toBe(false);
  });

  it('refuses to delete the owner', () => {
    const r = checkOwnerProtection(owner, null, 5);
    expect(r.allowed).toBe(false);
  });

  it('allows a no-op role write on the owner (still admin)', () => {
    const r = checkOwnerProtection(owner, 'ADMIN', 5);
    expect(r.allowed).toBe(true);
  });
});

describe('checkOwnerProtection — last admin', () => {
  it('refuses to demote the only admin, even a non-owner one', () => {
    delete process.env.OWNER_EMAIL; // no owner configured at all
    const r = checkOwnerProtection(admin2, 'USER', 1);
    expect(r.allowed).toBe(false);
  });

  it('refuses to delete the only admin', () => {
    delete process.env.OWNER_EMAIL;
    const r = checkOwnerProtection(admin2, null, 1);
    expect(r.allowed).toBe(false);
  });

  it('allows demoting an admin when others remain', () => {
    const r = checkOwnerProtection(admin2, 'USER', 3);
    expect(r.allowed).toBe(true);
  });
});

describe('checkOwnerProtection — ordinary users', () => {
  it('allows promoting a normal user to admin', () => {
    expect(checkOwnerProtection(member, 'ADMIN', 2).allowed).toBe(true);
  });

  it('allows deleting a normal user', () => {
    expect(checkOwnerProtection(member, null, 2).allowed).toBe(true);
  });

  it('allows changing a normal user among non-admin roles', () => {
    expect(checkOwnerProtection(member, 'AUTHOR', 2).allowed).toBe(true);
  });
});
