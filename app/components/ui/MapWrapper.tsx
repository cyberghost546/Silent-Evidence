'use client';
// =============================================================================
// MapWrapper.tsx  —  CLIENT COMPONENT
// =============================================================================
// Purpose:
//   A thin "SSR boundary" wrapper around HorrorMap that defers loading until
//   the browser is ready. HorrorMap uses Leaflet internally, and Leaflet
//   accesses `window`, `document`, and the DOM directly — none of which exist
//   during Next.js server-side rendering. Without this wrapper, importing
//   HorrorMap directly in a page would throw "window is not defined" during
//   the server render phase.
//
// Usage:
//   <MapWrapper stories={stories} />
//   Use this instead of <HorrorMap stories={stories} /> whenever you need the
//   map on a page or layout that is server-rendered.
//
// Props:
//   stories — array of story objects passed straight through to HorrorMap.
//             Each story is expected to have at minimum: lat, lng, slug, title.
//             Typed as `any[]` here because HorrorMap owns the stricter typing;
//             MapWrapper is intentionally a pass-through and should not duplicate
//             the type definition.
//
// Architecture notes:
//   - next/dynamic with { ssr: false } is the standard Next.js pattern for
//     lazy-loading client-only libraries. The component is NOT included in the
//     server-rendered HTML and NOT in the initial JS bundle — it is code-split
//     into its own chunk that loads after hydration.
//   - The `loading` function renders a placeholder that matches the map's final
//     height (h-[500px]) so the page layout doesn't jump when the map loads.
//     This prevents Cumulative Layout Shift (CLS), which affects Core Web Vitals.
//   - MapWrapper is a 'use client' component itself so it can be imported by
//     other client components without issue. It adds no interactive logic of its own.
// =============================================================================

import dynamic from 'next/dynamic';

// Dynamically import HorrorMap with SSR disabled.
// This tells Next.js to:
//   1. Exclude HorrorMap from the server render entirely.
//   2. Code-split HorrorMap into a separate JS chunk.
//   3. Display the `loading` component until the chunk is loaded and mounted.
const HorrorMap = dynamic(() => import('./HorrorMap'), {
  ssr: false, // critical: prevents "window is not defined" during SSR

  // Loading placeholder — shown while the Leaflet JS bundle is being downloaded
  // and the map tiles are initialising. Matches the map's final dimensions so
  // there is no layout shift when the real map appears.
  loading: () => (
    <div className="w-full h-[500px] rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
      <p className="text-gray-500">Loading map…</p>
    </div>
  ),
});

export default function MapWrapper({ stories }: { stories: any[] }) {
  // Pass stories straight through — MapWrapper's sole responsibility is
  // establishing the SSR boundary. All rendering logic lives in HorrorMap.
  return <HorrorMap stories={stories} />;
}
