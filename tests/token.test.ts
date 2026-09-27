// tests/token.test.ts
// Tests for lib/token.ts — reset/verification token hashing.
import { describe, it, expect } from 'vitest';
import { hashToken } from '@/lib/token';

describe('hashToken', () => {
  it('is deterministic for the same input', () => {
    expect(hashToken('abc123')).toBe(hashToken('abc123'));
  });
  it('produces a 64-char hex SHA-256 digest', () => {
    const h = hashToken('some-random-token');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it('differs for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });
  it('does not return the input (i.e. actually hashes)', () => {
    const raw = 'deadbeef'.repeat(8);
    expect(hashToken(raw)).not.toBe(raw);
  });
});
