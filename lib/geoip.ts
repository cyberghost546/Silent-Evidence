// lib/geoip.ts
// Resolves an IP address to country/city/lat/lng for the login map and security
// alerts. Returns null for private/loopback IPs and on any network error.
//
// WHY THIS IS OPT-IN NOW
// ----------------------
// This used to call ip-api.com over plain `http://`. An IP address is personal
// data, so that sent an identifiable attribute of every logging-in user across
// the open internet in cleartext, where any network hop could read it — and it
// was disclosed to nobody in the privacy policy. ip-api.com does not offer TLS
// on its free tier, so the endpoint itself had to change, not just the scheme.
//
// Two deliberate choices:
//
//   1. HTTPS only. `assertHttps` rejects any non-TLS provider URL rather than
//      quietly downgrading, so this cannot regress into cleartext by an env-var
//      edit. A misconfigured provider disables lookups instead of leaking.
//
//   2. Off unless configured. Sending user IPs to a third party is a disclosure
//      that belongs in the privacy policy, so it should be a decision someone
//      makes, not a default that ships. With no GEOIP_PROVIDER_URL set, lookups
//      return null and callers degrade gracefully — the login map simply shows
//      no location.
//
// CONFIGURE
//   GEOIP_PROVIDER_URL — an https:// template containing `{ip}`. Examples:
//     https://ipwho.is/{ip}
//     https://ipapi.co/{ip}/json/
//     https://pro.ip-api.com/json/{ip}?key=YOUR_KEY   (paid tier supports TLS)
//
// Whichever provider is chosen must be listed in the privacy policy's processor
// table (app/privacy/page.tsx, section 5) before it is switched on.

const PRIVATE = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|localhost)/;

export interface GeoResult {
  country: string;
  city:    string;
  lat:     number;
  lng:     number;
}

/** Refuses anything that is not https, so IPs can never travel in cleartext. */
function assertHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Providers disagree on field names, so normalise the few common shapes rather
 * than locking the app to one vendor. Returns null when the payload does not
 * contain a usable coordinate pair — including provider error responses, which
 * are typically HTTP 200 with a failure flag in the body.
 */
function normalise(data: Record<string, unknown>): GeoResult | null {
  // Explicit failure flags: ip-api uses status, ipwho.is uses success,
  // ipapi.co sets an `error` key.
  if (data.status === 'fail' || data.success === false || data.error) return null;

  const lat = Number(data.latitude ?? data.lat);
  const lng = Number(data.longitude ?? data.lon ?? data.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const country = typeof data.country === 'string' ? data.country
                : typeof data.country_name === 'string' ? data.country_name
                : '';
  const city = typeof data.city === 'string' ? data.city : '';

  return { country, city, lat, lng };
}

export async function lookupGeoIp(ip: string): Promise<GeoResult | null> {
  if (!ip || PRIVATE.test(ip)) return null;

  const template = process.env.GEOIP_PROVIDER_URL;
  // Not configured — geo lookup is simply off. Callers already handle null.
  if (!template) return null;

  const url = template.replace('{ip}', encodeURIComponent(ip));
  if (!assertHttps(url)) {
    console.warn('[geoip] GEOIP_PROVIDER_URL must use https — lookup skipped.');
    return null;
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return normalise(await res.json() as Record<string, unknown>);
  } catch {
    return null;
  }
}
