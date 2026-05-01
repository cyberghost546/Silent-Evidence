'use client';
// app/admin/login-map/page.tsx
//
// WHY 'use client'?
//   The Leaflet map library requires `window` to be defined, which only exists in
//   the browser. The map component must be loaded dynamically with ssr:false.
//   The filter state (all/success/failed) also requires useState.
//
// PURPOSE:
//   Security oversight tool — shows a world map pinpointing where login attempts
//   originated, colour-coded by success (red) or failure (orange). Useful for
//   spotting unusual geographic patterns, e.g. a spike of failed logins from a
//   country where no users live (potential credential-stuffing attack).
//
// DATA:
//   `markers`        — array of geo-located login events (lat/lng + metadata)
//   `countrySummary` — aggregated count per country (for the bar chart section)
//   `total`          — total number of geo-mapped logins
//   All data is fetched from GET /api/admin/login-map on mount.
//
// DYNAMIC IMPORT (ssr: false):
//   Leaflet reads `window.L` and attaches DOM listeners on import. Running it on
//   the server would crash because `window` doesn't exist in Node.js. The `dynamic()`
//   call with `ssr: false` defers the import to the browser after hydration.
//
// FILTERING:
//   The `filter` state is applied client-side — no extra API calls needed.
//   `filtered` is derived from `data.markers` on every render based on the active pill.
//   This is fine because the total marker count is small (capped by the API).
//
// PROGRESS BAR (Top Countries):
//   Each country's bar width is calculated as (count / total) * 100, giving a
//   proportional fill that makes the most-active country span the full width.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { LoginMarker } from '@/app/components/ui/LoginMap';

// Load the Leaflet map component without SSR — window must exist before Leaflet initialises
const LoginMap = dynamic(() => import('@/app/components/ui/LoginMap'), { ssr: false });

interface CountryRow { country: string; count: number }
interface MapData {
  markers:        LoginMarker[];
  countrySummary: CountryRow[];
  total:          number;
}

export default function LoginMapPage() {
  const [data,    setData]    = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'all' | 'success' | 'failed'>('all');

  useEffect(() => {
    fetch('/api/admin/login-map')
      .then(r => r.json())
      .then((d: MapData) => { setData(d?.markers ? d : null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = data?.markers?.filter(m =>
    filter === 'all'     ? true :
    filter === 'success' ? m.success :
    !m.success
  ) ?? [];

  const successCount = data?.markers?.filter(m => m.success).length  ?? 0;
  const failedCount  = data?.markers?.filter(m => !m.success).length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Login Origin Map</h1>
      <p className="text-gray-500 text-sm mb-6">
        Geographic distribution of login attempts based on IP geolocation.
        New logins are mapped automatically going forward.
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{data?.total ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Mapped Logins</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{successCount || '—'}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Successful</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{failedCount || '—'}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Failed</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {(['all', 'success', 'failed'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === f
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-600 self-center">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1" />successful
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 ml-3 mr-1" />failed
        </span>
      </div>

      {/* Map */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6 h-[480px]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500 text-sm animate-pulse">Loading map…</span>
          </div>
        ) : data?.total === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <p className="text-4xl">🌍</p>
            <p className="text-gray-400 text-sm">No geo data yet. It will appear after new logins.</p>
          </div>
        ) : (
          <LoginMap markers={filtered} />
        )}
      </div>

      {/* Two-column layout: country summary + recent logins */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Top countries */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Top Countries</h2>
          {data?.countrySummary.length ? (
            <div className="space-y-2">
              {data.countrySummary.map(({ country, count }) => {
                const pct = Math.round((count / (data.total || 1)) * 100);
                return (
                  <div key={country}>
                    <div className="flex justify-between text-xs text-gray-300 mb-1">
                      <span>{country}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 rounded-full bar-fill" style={{ '--fill': `${pct}%` } as React.CSSProperties} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No data yet.</p>
          )}
        </div>

        {/* Recent logins table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Recent Mapped Logins</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtered.slice(0, 20).map(m => (
              <div key={m.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-800/60 last:border-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${m.success ? 'bg-red-500' : 'bg-orange-400'}`} />
                <span className="text-gray-300 font-medium w-28 truncate">{m.username ?? 'unknown'}</span>
                <span className="text-gray-500 flex-1 truncate">{m.city ?? '—'}, {m.country ?? '—'}</span>
                <span className="text-gray-600 shrink-0">
                  {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-600 text-sm py-4 text-center">No logins match this filter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
