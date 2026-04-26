'use client';
// LoginMap.tsx — react-leaflet world map showing login origin markers.
// Loaded with dynamic(..., { ssr: false }) from the admin page to avoid SSR issues.

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface LoginMarker {
  id: number;
  username: string | null;
  country:  string | null;
  city:     string | null;
  lat:      number | null;
  lng:      number | null;
  success:  boolean;
  ip:       string;
  createdAt: string;
}

interface Props { markers: LoginMarker[] }

export default function LoginMap({ markers }: Props) {
  // Leaflet reads window at startup — must be client-only
  useEffect(() => {}, []);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={10}
      scrollWheelZoom
      className="w-full h-full rounded-xl"
      style={{ background: '#0f172a' }}
    >
      {/* Dark horror-themed tile layer from CartoDB */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      {markers.map(m => (
        m.lat != null && m.lng != null ? (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={6}
            pathOptions={{
              color:       m.success ? '#dc2626' : '#f97316',
              fillColor:   m.success ? '#dc2626' : '#f97316',
              fillOpacity: 0.75,
              weight: 1,
            }}
          >
            <Popup className="login-map-popup">
              <div className="text-xs space-y-0.5 min-w-[140px]">
                <p className="font-bold text-sm">{m.username ?? 'Unknown user'}</p>
                <p>{m.city ?? '—'}, {m.country ?? '—'}</p>
                <p className="text-gray-400">{m.ip}</p>
                <p className={m.success ? 'text-green-600 font-semibold' : 'text-orange-500 font-semibold'}>
                  {m.success ? '✓ Success' : '✗ Failed'}
                </p>
                <p className="text-gray-400">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            </Popup>
          </CircleMarker>
        ) : null
      ))}
    </MapContainer>
  );
}
