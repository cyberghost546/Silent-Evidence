/**
 * app/lists/page.tsx
 *
 * WHAT THIS FILE DOES:
 * The "My Lists" page — shows all reading lists belonging to the logged-in user.
 * Each list is a clickable card with a collage thumbnail made from the first 3
 * story cover images, plus the list name, visibility badge, and story count.
 *
 * COVER COLLAGE PATTERN:
 * We fetch the first 3 items per list (take: 3) just to get their cover images.
 * These are rendered as equal-width columns inside a fixed-height div using
 * flex + min-w-0. Fewer than 3 images just get wider — no JS needed.
 *
 * KEY DETAILS:
 * - orderBy: { updatedAt: 'desc' } — most recently modified lists appear first
 * - _count.items — total number of stories in the list (a single integer)
 * - items (take: 3) — only 3 items, only for the cover images
 * - isPublic badge — green "Public" or grey "Private" pill
 *
 * HOW TO REUSE:
 * The collage thumbnail pattern works for any ordered collection:
 *   <div className="h-32 flex overflow-hidden">
 *     {items.map(item => <img key={item.id} className="flex-1 object-cover min-w-0" />)}
 *   </div>
 * Because each image uses flex-1 they share the space equally.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';

export const metadata = { title: 'My Lists — Silent Evidence' };

export default async function ListsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) redirect('/login');

  const lists = await prisma.storyList.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { items: true } },
      items: {
        take: 3,
        orderBy: { order: 'asc' },
        include: { story: { select: { coverImage: true, title: true } } },
      },
    },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="w-1 h-7 bg-red-600 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-white">My Lists</h1>
              <p className="text-sm text-gray-500 mt-0.5">{lists.length} {lists.length === 1 ? 'list' : 'lists'}</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition">
            Browse stories to add →
          </Link>
        </div>

        {lists.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-white mb-2">No lists yet</h2>
            <p className="text-gray-500 mb-6">Open any story and click "Add to List" to get started.</p>
            <Link href="/" className="inline-block bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
              Explore Stories
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {lists.map(list => (
              <Link key={list.id} href={`/list/${list.id}`}
                className="group bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-200">
                {/* Cover collage from first 3 stories */}
                <div className="h-32 flex overflow-hidden">
                  {list.items.length > 0 ? list.items.map(item => (
                    item.story.coverImage
                      ? <img key={item.id} src={item.story.coverImage} alt="" className="flex-1 object-cover min-w-0" />
                      : <div key={item.id} className="flex-1 bg-gradient-to-br from-gray-700 to-gray-900" />
                  )) : (
                    <div className="w-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-4xl">📋</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white group-hover:text-red-300 transition-colors truncate">{list.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${list.isPublic ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                      {list.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                  {list.description && <p className="text-xs text-gray-500 line-clamp-1 mb-2">{list.description}</p>}
                  <p className="text-xs text-gray-600">{list._count.items} {list._count.items === 1 ? 'story' : 'stories'}</p>
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
