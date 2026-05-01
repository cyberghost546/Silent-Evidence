'use client';
// =============================================================================
// LoginMap.tsx  —  CLIENT COMPONENT
// =============================================================================
// Purpose:
//   An admin-only interactive world map that visualises where login attempts
//   originated. Each attempt is shown as a coloured circle marker:
//     - Red   (#dc2626) → successful login
//     - Orange (#f97316) → failed / rejected login attempt
//   Clicking a marker opens a Leaflet popup with details (username, city,
//   country, IP address, success/fail status, and timestamp).
//
// Usage:
//   This component is loaded with next/dynamic({ ssr: false }) from the admin
//   page because Leaflet (and react-leaflet) access the DOM directly and cannot
//   run during SSR. Wrap the import like this:
//
//     const LoginMap = dynamic(() => import('./LoginMap'), { ssr: false });
//     <LoginMap markers={loginLogRows} />
//
// Props:
//   markers — array of LoginMarker objects fetched server-side in the admin page.
//             Only markers with non-null lat/lng values are rendered on the map.
//
// Architecture notes:
//   - The empty useEffect() at the top is intentional: it forces Next.js to
//     treat this as a client-only component and serves as a reminder that Leaflet
//     reads `window` at startup. Without the 'use client' directive and the
//     dynamic import, Next.js would attempt to pre-render it on the server and
//     crash with "window is not defined".
//   - leaflet/dist/leaflet.css is imported here (not in globals.css) so the
//     Leaflet stylesheet is only loaded when this component is actually used.
//   - The CartoDB "dark_all" tile layer gives the map a dark horror-themed aesthetic
//     that fits the site's visual language without extra CSS customisation.
// =============================================================================

import { useEffect } from 'react';
import {
  MapContainer,     // root Leaflet map element — sets up the map instance
  TileLayer,        // loads and renders the background tile images
  CircleMarker,     // renders a coloured circle at a lat/lng coordinate
  Popup,            // renders a popup that appears when a marker is clicked
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Leaflet's required base styles

// ── LoginMarker type ──────────────────────────────────────────────────────────
// Exported so the parent admin page can type its data array correctly without
// duplicating the type definition.
export interface LoginMarker {
  id: number;
  username: string | null;   // null if the login attempt used an unknown username
  country:  string | null;   // geo-resolved country name (may be null if IP lookup failed)
  city:     string | null;   // geo-resolved city name
  lat:      number | null;   // latitude — null if geo-resolution failed
  lng:      number | null;   // longitude — null if geo-resolution failed
  success:  boolean;         // true = login succeeded; false = attempt was rejected
  ip:       string;          // originating IP address
  createdAt: string;         // ISO timestamp of the login attempt
}

// Props accepted by this component.
interface Props {
  markers: LoginMarker[];
}

export default function LoginMap({ markers }: Props) {

  // ── Empty effect: signals client-only usage ───────────────────────────────
  // This empty useEffect serves as a signal to developers (and tools) that this
  // component depends on the browser environment. Leaflet registers event
  // listeners and reads window.devicePixelRatio at startup — both require a DOM.
  // The dynamic import with ssr: false in the parent is the actual guard; this
  // effect adds a documentation layer.
  useEffect(() => {}, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // MapContainer from react-leaflet creates the Leaflet map instance.
    // All configuration is passed as props rather than calling L.map() imperatively.
    <MapContainer
      center={[20, 0]}         // initial centre: lat 20°N, lng 0° — roughly central world view
      zoom={2}                 // zoom level 2 shows the whole world comfortably
      minZoom={2}              // prevent zooming out past the world overview
      maxZoom={10}             // prevent zooming in too close (data isn't precise enough)
      scrollWheelZoom          // allow zooming with the mouse scroll wheel
      className="w-full h-full rounded-xl" // fill the parent container
      style={{ background: '#0f172a' }}     // dark navy fallback while tiles load
    >
      {/* ── Background tile layer ─────────────────────────────────────────── */}
      {/*
        CartoDB "dark_all" tiles provide a dark map style that matches the site's
        colour palette without any additional CSS overrides.
        {s}  — tile server subdomain (a/b/c) for load balancing
        {z}  — zoom level
        {x}/{y} — tile coordinates
        {r}  — "@2x" on retina displays (HiDPI), empty string otherwise
      */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      {/* ── Login attempt markers ────────────────────────────────────────── */}
      {/*
        Iterate over all markers. Skip any that have null lat/lng (geo-resolution
        failed for that IP). Using a conditional expression inside map() is fine
        here because React ignores null children.
      */}
      {markers.map(m =>
        m.lat != null && m.lng != null ? (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}   // [latitude, longitude] tuple
            radius={6}                // circle radius in pixels (constant across zoom levels)
            pathOptions={{
              // Colour encodes success/failure at a glance:
              //   Red    → successful login (normal, expected)
              //   Orange → failed attempt (may indicate brute-force or wrong credentials)
              color:       m.success ? '#dc2626' : '#f97316', // stroke colour
              fillColor:   m.success ? '#dc2626' : '#f97316', // fill colour
              fillOpacity: 0.75, // partially transparent so overlapping markers blend
              weight: 1,         // 1px stroke width
            }}
          >
            {/* ── Popup: shown when the admin clicks a marker ─────────────── */}
            {/* login-map-popup class allows targeted CSS in global styles if needed */}
            <Popup className="login-map-popup">
              <div className="text-xs space-y-0.5 min-w-[140px]">
                {/* Username (falls back to "Unknown user" if not recorded) */}
                <p className="font-bold text-sm">{m.username ?? 'Unknown user'}</p>
                {/* City + Country (both fall back to "—" if geo-resolution failed) */}
                <p>{m.city ?? '—'}, {m.country ?? '—'}</p>
                {/* Raw IP address — useful for cross-referencing abuse reports */}
                <p className="text-gray-400">{m.ip}</p>
                {/* Success / failure indicator with appropriate colours */}
                <p className={m.success ? 'text-green-600 font-semibold' : 'text-orange-500 font-semibold'}>
                  {m.success ? '✓ Success' : '✗ Failed'}
                </p>
                {/* Human-readable local date/time of the attempt */}
                <p className="text-gray-400">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            </Popup>
          </CircleMarker>
        ) : null
      )}
    </MapContainer>
  );
}
