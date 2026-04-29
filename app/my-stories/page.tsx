// app/my-stories/page.tsx
// Dashboard page showing all of the logged-in user's stories (drafts + published).
// Redirects to /login if the user is not authenticated.
// Displays each story with its status, view count, likes, and edit/delete actions.
// Story deletion hits DELETE /api/stories/[slug] and updates the list client-side.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';

export default async function MyStoriesPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const [user, stories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
    prisma.story.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
  ]);

  if (!user) redirect('/login');

  const published = stories.filter(s => s.status === 'PUBLISHED').length;
  const drafts    = stories.filter(s => s.status === 'DRAFT').length;
  const totalViews = stories.reduce((sum, s) => sum + s.views, 0);
  const totalLikes = stories.reduce((sum, s) => sum + s._count.likes, 0);

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

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Stories', value: stories.length },
            { label: 'Published', value: published },
            { label: 'Drafts', value: drafts },
            { label: 'Total Views', value: totalViews.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Story list */}
        {stories.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="mb-4">You haven&apos;t written any stories yet.</p>
            <Link href="/write" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition text-sm font-semibold">
              Write your first story
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {stories.map((story) => (
              <div key={story.id} className="bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]">
                {story.coverImage && (
                  <img src={story.coverImage} alt={story.title} className="w-full sm:w-24 h-16 object-cover rounded-lg flex-shrink-0" />
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
                    {/* Show the scheduled publish date/time for scheduled stories */}
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
        )}
      </div>
      <Footer />
    </main>
  );
}
