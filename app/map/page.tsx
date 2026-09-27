/**
 * app/map/page.tsx
 *
 * WHAT THIS FILE DOES:
 * The Horror Map page shows an interactive map with pins for every published
 * story that has a geographic location (latitude + longitude stored in the DB).
 * Below the map is a grid of story cards for quick browsing.
 *
 * SERVER COMPONENT:
 * This page runs entirely on the server — it queries the DB, then passes the
 * story array to <MapWrapper> (a Client Component that renders the Leaflet map).
 * Leaflet needs the browser's `window` object, so it must be a client component.
 *
 * WHERE DATA COMES FROM:
 * When an author writes a story they can optionally enter a location name.
 * The write/edit form geocodes that name to lat/lng and saves it in the DB.
 * Only stories with non-null lat/lng appear on this map.
 *
 * `stories as any`:
 * Prisma returns latitude/longitude as Decimal | null. The MapWrapper prop type
 * expects number | null. The `as any` cast skips TypeScript's Decimal check —
 * a small pragmatic shortcut since Prisma Decimals serialise to numbers in JSON.
 *
 * HOW TO REUSE:
 * To add a map to any Next.js project:
 *   1. Install react-leaflet and leaflet.
 *   2. Create a 'use client' wrapper that imports and renders <MapContainer>.
 *   3. Pass your geo-tagged items from a Server Component to the wrapper.
 */
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import MapWrapper from '@/app/components/ui/MapWrapper';

export const metadata = { title: 'Horror Map — Silent Evidence' };

export default async function MapPage() {
  // Only fetch stories that have both latitude and longitude set
  // `{ not: null }` is Prisma's way of filtering out null values
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', latitude: { not: null }, longitude: { not: null } },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      locationName: true,
      latitude: true,
      longitude: true,
      author: { select: { username: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-7 bg-red-600 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-white">Horror Map</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'} pinned to real locations
            </p>
          </div>
        </div>

        <MapWrapper stories={stories as any} />

        {stories.length === 0 && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            No stories with locations yet. Authors can add a location when writing a story.
          </div>
        )}

        {stories.length > 0 && (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((story) => (
              <a
                key={story.id}
                href={`/story/${story.slug}`}
                className="group flex items-center gap-3 bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 transition"
              >
                <div className="min-w-0">
                  <p className="text-xs text-red-400 font-semibold truncate">
                    {story.locationName}
                  </p>
                  <p className="text-sm text-white group-hover:text-red-300 transition truncate">
                    {story.title}
                  </p>
                  <p className="text-xs text-gray-500">by {story.author.username}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
