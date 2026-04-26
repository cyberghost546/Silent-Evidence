// lib/geoip.ts
// Resolves an IP address to country/city/lat/lng using ip-api.com (free, server-side only).
// Returns null for private/loopback IPs and on any network error.

const PRIVATE = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|localhost)/;

export interface GeoResult {
  country: string;
  city:    string;
  lat:     number;
  lng:     number;
}

export async function lookupGeoIp(ip: string): Promise<GeoResult | null> {
  if (!ip || PRIVATE.test(ip)) return null;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { status: string; country: string; city: string; lat: number; lon: number };
    if (data.status !== 'success') return null;
    return { country: data.country, city: data.city, lat: data.lat, lng: data.lon };
  } catch {
    return null;
  }
}
