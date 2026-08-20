'use client';
// app/components/ui/HorrorMap.tsx
// An interactive world map that pins every story that has a real-world location.
// Built with Leaflet.js using a dark-themed CARTO tile layer.
//
// Why Leaflet is imported dynamically (inside useEffect):
//   Leaflet directly references the browser's `window` object, so it can't run
//   on the server during Next.js server-side rendering. Importing it lazily inside
//   useEffect ensures it only ever runs in the browser.

import { useEffect, useRef } from 'react';

// Shape of the story data this component receives as a prop
type Story = {
  id: number;
  title: string;
  slug: string;
  locationName: string; // human-readable place name shown in the popup header
  latitude: number;
  longitude: number;
  excerpt?: string | null;
  author: { username: string };
};

export default function HorrorMap({ stories }: { stories: Story[] }) {
  // mapRef attaches to the <div> that Leaflet will render its map canvas into
  const mapRef = useRef<HTMLDivElement>(null);
  // mapInstance holds the Leaflet map object so we can destroy it on unmount
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    // Don't initialise twice (strict mode renders effects twice in dev)
    if (mapInstance.current || !mapRef.current) return;

    // Flag to cancel the async import if the component unmounts before it resolves
    let cancelled = false;

    // Dynamically import Leaflet (client-only)
    import('leaflet').then(L => {
      // Bail out if the component was unmounted or map already initialized
      if (cancelled || !mapRef.current || (mapRef.current as any)._leaflet_id) return;

      // Leaflet's default icon paths break in Next.js because of how assets are
      // bundled. Deleting the internal resolver and pointing to the CDN is the
      // standard fix recommended by the Leaflet community.
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Create the map centred at [20, 0] (roughly the Atlantic) at zoom 2 (world view)
      const map = L.map(mapRef.current!).setView([20, 0], 2);
      mapInstance.current = map;

      // Dark CARTO tile layer — matches the site's horror aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'OpenStreetMap contributors, CARTO',
        maxZoom: 18,
      }).addTo(map);

      // Custom skull marker icon using a div with an emoji + glowing drop-shadow
      const skullIcon = L.divIcon({
        html: '',
        className: '',    // empty string removes Leaflet's default white box
        iconSize: [28, 28],
        iconAnchor: [14, 28],   // bottom-centre of the icon sits on the coordinate
        popupAnchor: [0, -30],  // popup opens above the marker
      });

      // Place one skull marker on the map for each story with a location
      stories.forEach(story => {
        // Popup HTML — inline styles are needed because Leaflet popups are outside
        // the Next.js component tree so Tailwind classes won't be applied.
        const popup = `
          <div style="max-width:200px;font-family:sans-serif">
            <p style="font-size:11px;color:#8b5cf6;font-weight:700;margin:0 0 4px;text-transform:uppercase">${story.locationName}</p>
            <a href="/story/${story.slug}" style="font-size:13px;font-weight:600;color:#fff;text-decoration:none;display:block;margin-bottom:4px">${story.title}</a>
            <p style="font-size:11px;color:#9ca3af;margin:0">by ${story.author.username}</p>
            ${story.excerpt ? `<p style="font-size:11px;color:#9ca3af;margin:4px 0 0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${story.excerpt}</p>` : ''}
            <a href="/story/${story.slug}" style="display:inline-block;margin-top:8px;font-size:11px;color:#8b5cf6">Read →</a>
          </div>`;

        // Place a star marker on the map and bind the horror-styled popup to it
        L.marker([story.latitude, story.longitude], { icon: skullIcon })
          .addTo(map)
          .bindPopup(popup, { className: 'horror-popup' }); // horror-popup applies custom dark styles
      });
    });

    // Cleanup: if this component unmounts (e.g. user navigates away), destroy
    // the Leaflet map so it doesn't leak memory or try to update a removed DOM node.
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [stories]); // re-run if the stories list changes (e.g. after filtering)

  return (
    <>
      {/* Scoped CSS that overrides Leaflet's default popup bubble colour
          to match the dark site theme. Leaflet renders popups outside our
          React tree, so we can't use Tailwind classes on them directly. */}
      <style>{`.horror-popup .leaflet-popup-content-wrapper{background:#1f2937;border:1px solid #374151;color:#fff;border-radius:12px}.horror-popup .leaflet-popup-tip{background:#1f2937}`}</style>

      {/* The empty div that Leaflet will render the map canvas into */}
      <div ref={mapRef} className="w-full h-[500px] rounded-xl overflow-hidden border border-gray-700" />
    </>
  );
}
