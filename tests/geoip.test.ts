// tests/geoip.test.ts
// Tests for lib/geoip.ts.
//
// The property that actually matters here is that a user's IP address never
// leaves the server over an unencrypted connection. This module previously
// called ip-api.com over plain http://, so these tests exist to make sure that
// cannot come back — a future edit that points GEOIP_PROVIDER_URL at an http://
// endpoint must fail the suite rather than silently start leaking IPs again.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lookupGeoIp } from '@/lib/geoip';

const REAL_IP = '8.8.8.8';

/** Installs a fetch spy that records the URL it was called with. */
function stubFetch(payload: unknown, ok = true) {
  // The `input` parameter is declared even though the stub ignores it, so the
  // recorded call is typed and `mock.calls[0][0]` can be read below.
  const spy = vi.fn(async (_input: RequestInfo | URL) =>
    ({ ok, json: async () => payload }) as unknown as Response);
  vi.stubGlobal('fetch', spy);
  return spy;
}

beforeEach(() => {
  delete process.env.GEOIP_PROVIDER_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('lookupGeoIp — cleartext protection', () => {
  it('refuses an http:// provider and makes no request at all', async () => {
    process.env.GEOIP_PROVIDER_URL = 'http://ip-api.com/json/{ip}';
    const spy = stubFetch({ status: 'success', country: 'X', city: 'Y', lat: 1, lon: 2 });

    expect(await lookupGeoIp(REAL_IP)).toBeNull();
    // The important half: it did not downgrade, it declined to call.
    expect(spy).not.toHaveBeenCalled();
  });

  it('never sends the IP anywhere when no provider is configured', async () => {
    const spy = stubFetch({});
    expect(await lookupGeoIp(REAL_IP)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('uses https when one is configured', async () => {
    process.env.GEOIP_PROVIDER_URL = 'https://ipwho.is/{ip}';
    const spy = stubFetch({ success: true, country: 'Ireland', city: 'Cork', latitude: 51.9, longitude: -8.5 });

    await lookupGeoIp(REAL_IP);
    const calledWith = String(spy.mock.calls[0][0]);
    expect(calledWith.startsWith('https://')).toBe(true);
    expect(calledWith).toContain(REAL_IP);
  });

  it('rejects a malformed provider URL rather than calling it', async () => {
    process.env.GEOIP_PROVIDER_URL = 'not-a-url/{ip}';
    const spy = stubFetch({});
    expect(await lookupGeoIp(REAL_IP)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('lookupGeoIp — private addresses', () => {
  // Private ranges identify nobody and would waste a lookup, so they short-circuit.
  it.each(['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.4.4', '::1', 'localhost', ''])(
    'returns null for %s without calling out',
    async (ip) => {
      process.env.GEOIP_PROVIDER_URL = 'https://ipwho.is/{ip}';
      const spy = stubFetch({ success: true, latitude: 1, longitude: 2 });
      expect(await lookupGeoIp(ip)).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    },
  );
});

describe('lookupGeoIp — provider response shapes', () => {
  beforeEach(() => {
    process.env.GEOIP_PROVIDER_URL = 'https://example.test/{ip}';
  });

  it('parses the ipwho.is shape', async () => {
    stubFetch({ success: true, country: 'Ireland', city: 'Cork', latitude: 51.89, longitude: -8.47 });
    expect(await lookupGeoIp(REAL_IP)).toEqual({ country: 'Ireland', city: 'Cork', lat: 51.89, lng: -8.47 });
  });

  it('parses the ip-api shape', async () => {
    stubFetch({ status: 'success', country: 'Japan', city: 'Osaka', lat: 34.69, lon: 135.5 });
    expect(await lookupGeoIp(REAL_IP)).toEqual({ country: 'Japan', city: 'Osaka', lat: 34.69, lng: 135.5 });
  });

  it('parses the ipapi.co shape', async () => {
    stubFetch({ country_name: 'Brazil', city: 'Recife', latitude: -8.05, longitude: -34.9 });
    expect(await lookupGeoIp(REAL_IP)).toEqual({ country: 'Brazil', city: 'Recife', lat: -8.05, lng: -34.9 });
  });

  // Providers signal failure in the body with HTTP 200, so a naive parse would
  // store a bogus 0,0 coordinate on the login map.
  it.each([
    ['ip-api failure flag', { status: 'fail', message: 'reserved range' }],
    ['ipwho.is failure flag', { success: false }],
    ['ipapi.co error key', { error: true, reason: 'RateLimited' }],
    ['missing coordinates', { country: 'Nowhere', city: 'Nowhere' }],
    ['non-numeric coordinates', { latitude: 'abc', longitude: 'def' }],
  ])('returns null for %s', async (_label, payload) => {
    stubFetch(payload);
    expect(await lookupGeoIp(REAL_IP)).toBeNull();
  });

  it('returns null on a non-ok HTTP response', async () => {
    stubFetch({ success: true, latitude: 1, longitude: 2 }, false);
    expect(await lookupGeoIp(REAL_IP)).toBeNull();
  });

  it('returns null when the provider throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    expect(await lookupGeoIp(REAL_IP)).toBeNull();
  });
});
