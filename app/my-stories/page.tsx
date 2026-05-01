// app/my-stories/page.tsx
// Dashboard page showing all of the logged-in user's stories (drafts + published).
// Redirects to /login if the user is not authenticated.
// Stories are paginated (PAGE_SIZE per page) via ?page= search param.
// Stats (totals) are computed over all stories, not just the current page.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';

const PAGE_SIZE = 10;

export default async function MyStoriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page ?? 1));
  const skip = (page - 1) * PAGE_SIZE;

  const [user, totalCount, allStats, stories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),

    // Total number of user's stories — drives pagination math
    prisma.story.count({ where: { authorId: userId } }),

    // Lightweight select over ALL stories for the stats row
    prisma.story.findMany({
      where: { authorId: userId },
      select: { status: true, views: true, _count: { select: { likes: true } } },
    }),

    // Paginated list for display
    prisma.story.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
  ]);

  if (!user) redirect('/login');

  const published   = allStats.filter(s => s.status === 'PUBLISHED').length;
  const drafts      = allStats.filter(s => s.status === 'DRAFT').length;
  const totalViews  = allStats.reduce((sum, s) => sum + s.views, 0);
  const totalPages  = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Page header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">My Stories</h1>
            <p className="text-sm text-gray-500 mt-1">Manage everything you&apos;ve written</p>
          </div>
          <Link href="/write" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm">
            + New Story
          </Link>
        </div>

        {/* Stats row — always shows totals across ALL stories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Stories', value: totalCount },
            { label: 'Published',     value: published },
            { label: 'Drafts',        value: drafts },
            { label: 'Total Views',   value: totalViews.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Story list */}
        {totalCount === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="mb-4">You haven&apos;t written any stories yet.</p>
            <Link href="/write" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition text-sm font-semibold">
              Write your first story
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {stories.map((story) => (
                <div key={story.id} className="bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]">
                  {story.coverImage && (
                    <Image src={story.coverImage} alt={story.title} width={96} height={64} className="w-full sm:w-24 h-16 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white truncate">{story.title}</h3>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        story.status === 'PUBLISHED'  ? 'bg-green-500/20 text-green-400'  :
                        story.status === 'DRAFT'      ? 'bg-yellow-500/20 text-yellow-400':
                        story.status === 'SCHEDULED'  ? 'bg-blue-500/20 text-blue-400'   :
                                                        'bg-gray-600/30 text-gray-400'
                      }`}>
                        {story.status}
                      </span>
                      {story.status === 'SCHEDULED' && story.scheduledAt && (
                        <span className="text-[10px] text-blue-400/70">
                          🕐 {new Date(story.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                      {story.featured && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Featured</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {story.category.name} · {new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                      <span>👁 {story.views.toLocaleString()}</span>
                      <span>♥ {story._count.likes}</span>
                      <span>💬 {story._count.comments}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {story.status === 'PUBLISHED' && (
                      <Link href={`/story/${story.slug}`} className="px-3 py-1.5 text-xs border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-400 transition">
                        View
                      </Link>
                    )}
                    <Link href={`/story/${story.slug}/edit`} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition">
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}`}
                    className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-red-600/50 text-gray-300 hover:text-white rounded-lg transition"
                  >
                    ← Previous
                  </Link>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-600">…</span>
                      ) : (
                        <Link
                          key={p}
                          href={`?page=${p}`}
                          className={`w-9 h-9 flex items-center justify-center text-sm rounded-lg border transition ${
                            p === page
                              ? 'bg-red-600 border-red-600 text-white font-bold'
                              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-red-600/50 hover:text-white'
                          }`}
                        >
                          {p}
                        </Link>
                      )
                    )}
                </div>

                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}`}
                    className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 hover:border-red-600/50 text-gray-300 hover:text-white rounded-lg transition"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}

            {/* Page indicator */}
            {totalPages > 1 && (
              <p className="text-center text-xs text-gray-600 mt-4">
                Page {page} of {totalPages} · {totalCount} stories total
              </p>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
