// tests/csp.test.ts
// Tests for lib/csp.ts — the policy that decides whether injected script can run.

import { describe, it, expect } from 'vitest';
import { buildCsp, generateNonce } from '@/lib/csp';

describe('buildCsp — production', () => {
  const { value, headerName } = buildCsp('NONCE123', true);

  it('drops unsafe-inline from script-src in production', () => {
    const scriptSrc = value.split(';').find((d) => d.trim().startsWith('script-src'))!;
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
  });

  it('trusts the per-request nonce and strict-dynamic', () => {
    expect(value).toContain("'nonce-NONCE123'");
    expect(value).toContain("'strict-dynamic'");
  });

  it('keeps object-src none and frame-ancestors locked down', () => {
    expect(value).toContain("object-src 'none'");
    expect(value).toContain("frame-ancestors 'self'");
    expect(value).toContain("base-uri 'self'");
  });

  it('enforces by default', () => {
    expect(headerName).toBe('Content-Security-Policy');
  });

  it('can be report-only for a safe rollout', () => {
    expect(buildCsp('N', true, true).headerName).toBe('Content-Security-Policy-Report-Only');
  });
});

describe('buildCsp — development', () => {
  it('keeps the looser policy so HMR works', () => {
    const scriptSrc = buildCsp('N', false)
      .value.split(';')
      .find((d) => d.trim().startsWith('script-src'))!;
    expect(scriptSrc).toContain('unsafe-inline');
    expect(scriptSrc).toContain('unsafe-eval');
  });
});

describe('generateNonce', () => {
  it('produces a fresh non-empty nonce each call', () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });
});
