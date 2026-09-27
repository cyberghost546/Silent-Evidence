// tests/earnings.test.ts
// Tests for the money math in lib/earnings.ts. Rounding and the split are the
// parts that must be exactly right — an off-by-one here is a real accounting bug.

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { authorShare, platformShare, PLATFORM_FEE_BPS } from '@/lib/earnings';

describe('platform fee split', () => {
  it('is 10% by default', () => {
    expect(PLATFORM_FEE_BPS).toBe(1000);
  });

  it('gives the author 90% of a round amount', () => {
    expect(authorShare(1000)).toBe(900);
    expect(platformShare(1000)).toBe(100);
  });

  it('always sums back to the gross (no cents lost or invented)', () => {
    for (const gross of [1, 99, 100, 199, 250, 333, 499, 12345, 1_000_000]) {
      expect(authorShare(gross) + platformShare(gross)).toBe(gross);
    }
  });

  it('rounds the author share to the nearest cent', () => {
    // 99 * 0.9 = 89.1 → 89; platform gets the remaining 10.
    expect(authorShare(99)).toBe(89);
    expect(platformShare(99)).toBe(10);
    // 333 * 0.9 = 299.7 → 300; platform gets 33.
    expect(authorShare(333)).toBe(300);
    expect(platformShare(333)).toBe(33);
  });

  it('handles zero cleanly', () => {
    expect(authorShare(0)).toBe(0);
    expect(platformShare(0)).toBe(0);
  });
});
