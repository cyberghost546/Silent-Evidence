/**
 * app/forums/page.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the Forums index page — a directory of all discussion boards.
 * It lists each forum as a clickable card showing its name, description,
 * post count, and the title of the most-recent post.
 *
 * SELF-SEEDING PATTERN:
 * The `ensureForums()` function runs on every request. If the Forum table
 * is empty (e.g. the first time the app boots), it creates the default set
 * of boards automatically — no manual DB seed script needed.
 * This is handy for simple apps; for larger projects you'd use a proper
 * seed file or migration.
 *
 * KEY PRISMA FEATURES USED:
 * - prisma.forum.count()          — returns a single integer, no data loaded
 * - prisma.forum.createMany()     — insert multiple rows in one query
 * - orderBy: { order: 'asc' }    — sort forums by a custom `order` integer column
 * - include: { _count: ... }      — get the count of related posts without loading them
 * - posts: { take: 1, orderBy }  — get only the latest post per forum (efficient)
 * - reduce((s, f) => s + f._count.posts, 0) — JS array reduce to sum up total posts
 *
 * HOW TO REUSE:
 * Copy `ensureForums()` for any "seed-on-first-visit" feature.
 * Replace the data array with your own default categories/boards/tags.
 */
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';

export const metadata = { title: 'Forums — Silent Evidence' };

// Seed default forums if none exist
async function ensureForums() {
  const count = await prisma.forum.count();
  if (count === 0) {
    await prisma.forum.createMany({
      data: [
        { name: 'General Discussion', slug: 'general', description: 'Talk about anything horror, paranormal, or unexplained.', icon: '💀', order: 1 },
        { name: 'True Crime', slug: 'true-crime', description: 'Discuss real cases, investigations, and unsolved mysteries.', icon: '🔍', order: 2 },
        { name: 'Story Feedback & Reviews', slug: 'feedback', description: 'Get feedback on your stories or review others.', icon: '📖', order: 3 },
        { name: 'Paranormal Encounters', slug: 'paranormal', description: 'Share and discuss personal paranormal experiences.', icon: '👻', order: 4 },
        { name: 'Writing Tips', slug: 'writing-tips', description: 'Share tips, techniques, and advice for horror writing.', icon: '✍️', order: 5 },
        { name: 'Off Topic', slug: 'off-topic', description: 'Anything goes.', icon: '🌙', order: 6 },
      ],
    });
  }
}

export default async function ForumsPage() {
  // Seed default boards on first visit so the page is never blank out-of-the-box
  await ensureForums();

  // Fetch all forums ordered by their display order column.
  // We include:
  //   _count.posts  — total number of posts in each forum (a single integer)
  //   posts (take:1) — only the very latest post, used to show "Latest: …" preview
  const forums = await prisma.forum.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { posts: true } },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { author: { select: { username: true } } },
      },
    },
  });

  // Sum up posts across all forums for the header subtitle
  const totalPosts = forums.reduce((s, f) => s + f._count.posts, 0);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-1 h-7 bg-red-600 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-white">Forums</h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalPosts} posts across {forums.length} boards</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {forums.map(forum => (
            <Link key={forum.id} href={`/forums/${forum.slug}`}
              className="group flex items-center gap-5 bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl p-5 transition-all duration-200">
              <div className="text-3xl shrink-0 w-12 text-center">{forum.icon}</div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white group-hover:text-red-300 transition-colors">{forum.name}</h2>
                {forum.description && <p className="text-sm text-gray-500 mt-0.5">{forum.description}</p>}
                {forum.posts[0] && (
                  <p className="text-xs text-gray-600 mt-2 truncate">
                    Latest: <span className="text-gray-400">{forum.posts[0].title}</span> by {forum.posts[0].author.username}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-white">{forum._count.posts}</p>
                <p className="text-xs text-gray-600">posts</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
