// app/offline-reads/page.tsx
// Server component — the user's personal offline reading library.
//
// Fetches all stories the current user has saved for offline reading via
// the OfflineSave model, then renders them in a grid.
// Auth required: redirects to /login if the user is not logged in.

import { redirect }   from 'next/navigation';
import { cookies }    from 'next/headers';
import { prisma }     from '@/lib/prisma';
import Link           from 'next/link';
import Image          from 'next/image';
import Header         from '@/app/components/ui/Header';
import Footer         from '@/app/components/ui/Footer';

export const metadata = {
  title:       'Offline Library — Silent Evidence',
  description: 'Stories you have saved for offline reading.',
};

export default async function OfflineReadsPage() {
  // ── Auth check ────────────────────────────────────────────────────────────
  // Read the userId cookie set at login; redirect unauthenticated visitors.
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) redirect('/login');

  // ── Data fetch ────────────────────────────────────────────────────────────
  // Get all OfflineSave rows for this user, newest first, with the story fields
  // we need to render each card.
  const saves = await prisma.offlineSave.findMany({
    where:   { userId },
    orderBy: { savedAt: 'desc' },
    include: {
      story: {
        select: {
          id:         true,
          title:      true,
          slug:       true,
          excerpt:    true,
          coverImage: true,
          mood:       true,
          author:     { select: { username: true } },
        },
      },
    },
  });

  // Extract just the story objects — the OfflineSave wrapper isn't needed in JSX
  const stories = saves.map((s) => s.story);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
 Your Offline Library
          </h1>
          <p className="mt-2 text-gray-400 text-sm">
            These stories are cached on your device so you can read them without internet.
          </p>
        </div>

        {/* Decorative red accent line under the heading */}
        <div className="w-16 h-1 bg-red-600 rounded-full mt-4 mb-8" />

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {stories.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium text-gray-400">No stories saved yet.</p>
            <p className="text-sm mt-2">
              Tap on any story to save it for offline reading.
            </p>
          </div>
        )}

        {/* ── Story grid ───────────────────────────────────────────────────── */}
        {stories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/story/${story.slug}`}
                className="group block rounded-xl overflow-hidden bg-gray-800 border border-gray-700
                           hover:border-red-600 transition-colors duration-150"
              >
                {/* ── Cover image ──────────────────────────────────────────── */}
                <div className="relative w-full h-44 bg-gray-700">
                  {story.coverImage ? (
                    <Image
                      src={story.coverImage}
                      alt={story.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    // Fallback placeholder when no cover is set
                    <div className="flex items-center justify-center h-full text-gray-600 text-5xl">
                    </div>
                  )}

                  {/* Offline badge overlaid on the cover so it's clear at a glance */}
                  <span className="absolute top-2 right-2 bg-black/70 text-green-400 text-xs
                                   font-semibold px-2 py-0.5 rounded-full">
                    ✓ Offline
                  </span>
                </div>

                {/* ── Card body ────────────────────────────────────────────── */}
                <div className="p-4">
                  {/* Story title — clamps to 2 lines */}
                  <h2 className="font-bold text-white text-base leading-snug line-clamp-2
                                 group-hover:text-red-400 transition-colors">
                    {story.title}
                  </h2>

                  {/* Author attribution */}
                  <p className="text-xs text-gray-400 mt-1">
                    by{' '}
                    <span className="text-gray-300 font-medium">
                      {story.author.username}
                    </span>
                  </p>

                  {/* Excerpt — clamp to 3 lines so cards stay uniform height */}
                  {story.excerpt && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                      {story.excerpt}
                    </p>
                  )}

                  {/* Mood tag — small pill at the bottom of the card */}
                  {story.mood && (
                    <span className="mt-3 inline-block text-xs bg-gray-700 text-gray-300
                                     px-2 py-0.5 rounded-full capitalize">
                      {story.mood.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
