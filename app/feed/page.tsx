/**
 * app/feed/page.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the personalised "My Feed" page. It is a Server Component (no
 * 'use client' at the top) which means it runs entirely on the server and
 * the output is sent as HTML — no JavaScript is downloaded for this page.
 *
 * The feed shows the 20 most-recent published stories written by authors
 * the logged-in user follows. If you're not logged in, you're redirected
 * to /login. If you don't follow anyone yet, an empty state is shown.
 *
 * HOW IT WORKS STEP BY STEP:
 * 1. Read the userId cookie to get the logged-in user's ID.
 * 2. Find everyone that user follows (prisma.follow.findMany).
 * 3. Extract just the IDs of those followed accounts.
 * 4. Fetch the 20 newest published stories from those authors.
 * 5. Render a clickable card for each story.
 *
 * HOW TO REUSE:
 * - Any "personalised feed" feature works the same way: get a list of
 *   followed/subscribed entities, then query for their content.
 * - Replace the Follow table with whatever relationship your app has
 *   (e.g. subscribed channels, joined groups).
 * - The reading-time helper is reusable in any app with long text.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { readingTime } from '@/lib/readingTime';

export default async function FeedPage() {
  // Read the session cookie — Next.js cookies() gives access to request cookies on the server.
  const cookieStore = await cookies();
  // Convert the cookie value to a number; default to 0 if missing.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  // If the user is not logged in, send them to the login page immediately.
  if (!userId) redirect('/login');

  // Step 1: Find all users that this person follows.
  // We only need the followingId (the ID of the author they follow), not the full record.
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  // Extract just the IDs into a plain array so we can use them in the next query.
  const followingIds = following.map(f => f.followingId);

  // Step 2: Fetch stories — only if the user actually follows someone.
  // Using a ternary: if followingIds is empty we skip the DB query and return [].
  // authorId: { in: followingIds } means "story must be written by one of these authors".
  const stories = followingIds.length > 0
    ? await prisma.story.findMany({
        where: { status: 'PUBLISHED', authorId: { in: followingIds } },
        orderBy: { createdAt: 'desc' },  // newest first
        take: 20,                         // limit to 20 stories per page load
        include: {
          // We need the author's username and avatar for the card header
          author: { select: { username: true, profile: { select: { avatar: true } } } },
          // We need the category to show a label like "Supernatural"
          category: { select: { name: true, slug: true } },
          // _count gives us aggregate counts without loading every like/comment record
          _count: { select: { likes: true, comments: true } },
        },
      })
    : [];

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Decorative red bar + page title */}
        <div className="flex items-center gap-3 mb-8">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h1 className="text-2xl font-bold text-white">My Feed</h1>
        </div>

        {/* Three possible states:
            1. User follows nobody  → prompt to discover authors
            2. User follows someone but they haven't posted → empty message
            3. Stories exist        → render the story cards             */}
        {followingIds.length === 0 ? (
          // Empty state — user doesn't follow anyone yet
          <div className="text-center py-20">
            <p className="text-gray-400 mb-2">You&apos;re not following anyone yet.</p>
            <p className="text-gray-600 text-sm mb-6">Visit an author&apos;s profile and click Follow to see their stories here.</p>
            <Link href="/search" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition">
              Discover stories
            </Link>
          </div>
        ) : stories.length === 0 ? (
          // Follows authors but none have posted yet
          <p className="text-center text-gray-500 py-20">No stories from people you follow yet.</p>
        ) : (
          // Story cards list
          <div className="flex flex-col gap-5">
            {stories.map((story) => {
              // Fall back to a generated avatar if the author hasn't uploaded one.
              // ui-avatars.com generates an avatar image from initials — very handy!
              const avatar = story.author.profile?.avatar ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=dc2626&color=fff&size=64`;
              return (
                // Each card is a full <Link> so clicking anywhere navigates to the story
                <Link key={story.id} href={`/story/${story.slug}`}
                  className="group flex gap-4 bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-4 transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.15)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)]"
                >
                  {story.coverImage && (
                    <Image src={story.coverImage} alt={story.title} width={112} height={80} className="object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Author row — tiny avatar + username + category */}
                    <div className="flex items-center gap-2 mb-1">
                      <Image src={avatar} alt={story.author.username} width={20} height={20} className="rounded-full object-cover" />
                      <span className="text-xs text-gray-400">{story.author.username}</span>
                      <span className="text-xs text-gray-600">in</span>
                      <span className="text-xs text-red-400">{story.category.name}</span>
                    </div>
                    {/* Story title — line-clamp-2 cuts it off at 2 lines with "…" */}
                    <h3 className="text-base font-semibold text-white group-hover:text-red-300 transition line-clamp-2">{story.title}</h3>
                    {/* Excerpt — only shown if one exists */}
                    {story.excerpt && <p className="text-sm text-gray-500 line-clamp-2 mt-1">{story.excerpt}</p>}
                    {/* Stats footer — reading time (computed from word count), likes, comments, date */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                      <span>{readingTime(story.content)}</span>
                      <span>♥ {story._count.likes}</span>
                      <span>💬 {story._count.comments}</span>
                      {/* ml-auto pushes the date to the right edge */}
                      <span className="ml-auto">{new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
