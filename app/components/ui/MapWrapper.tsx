'use client';
// MapWrapper.tsx
// Thin client-side wrapper around HorrorMap that defers loading until the browser
// is ready. HorrorMap uses Leaflet, which accesses the DOM directly and cannot
// run on the server — wrapping it with next/dynamic + ssr: false prevents the
// "window is not defined" error during SSR.
//
// Props:
//   stories — array of story objects passed straight through to HorrorMap.
//             Each story is expected to have at minimum a lat/lng and slug.

import dynamic from 'next/dynamic';

// Dynamically import HorrorMap with SSR disabled.
// The loading fallback is shown until the Leaflet bundle has loaded and mounted.
const HorrorMap = dynamic(() => import('./HorrorMap'), {
  ssr: false,
  loading: () => (
    // Placeholder matches the map's final dimensions so the layout doesn't jump
    <div className="w-full h-[500px] rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
      <p className="text-gray-500">Loading map…</p>
    </div>
  ),
});

export default function MapWrapper({ stories }: { stories: any[] }) {
  // Pass stories straight through — MapWrapper exists purely to handle the SSR boundary
  return <HorrorMap stories={stories} />;
}
