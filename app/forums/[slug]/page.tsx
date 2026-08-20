/**
 * app/forums/[slug]/page.tsx
 *
 * WHAT THIS FILE DOES:
 * This is a single forum board page (e.g. /forums/general).
 * It shows all posts in that board, sorted with pinned posts first then
 * newest first. Logged-in users see a form to create a new post.
 *
 * DYNAMIC ROUTING:
 * The [slug] folder makes this a dynamic route. Next.js automatically
 * extracts the slug from the URL and passes it in `params`. Because
 * params is a Promise in Next.js 15+, we must `await` it first.
 *
 * PINNED POSTS:
 * orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] sorts by two fields:
 *   - pinned DESC → true (1) comes before false (0), so pinned posts float up
 *   - createdAt DESC → newest among non-pinned (or pinned) next
 *
 * HOW TO REUSE:
 * This "board with posts" pattern works for any category/channel page.
 * Swap Forum → your model, ForumPost → your post model, and adjust
 * the include fields as needed.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import NewPostForm from '@/app/components/ui/NewPostForm';

type Props = { params: Promise<{ slug: string }> };

export default async function ForumPage({ params }: Props) {
  // await params because Next.js 15 makes dynamic route params a Promise
  const { slug } = await params;
  const cookieStore = await cookies();
  // || null converts 0 (not logged in) to null so we can do simple truthiness checks
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch the forum by slug, including all its posts with author info and reply count
  const forum = await prisma.forum.findUnique({
    where: { slug },
    include: {
      posts: {
        // Sort: pinned posts first (true > false when sorted desc), then newest
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: { select: { username: true, profile: { select: { avatar: true } } } },
          // _count.replies gives us the reply count without loading reply records
          _count: { select: { replies: true } },
        },
      },
    },
  });

  // If the slug doesn't match any forum, show the built-in 404 page
  if (!forum) return notFound();

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-xs text-gray-500">
          <Link href="/forums" className="hover:text-gray-300 transition">Forums</Link>
          <span>/</span>
          <span className="text-gray-300">{forum.name}</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{forum.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{forum.name}</h1>
            {forum.description && <p className="text-sm text-gray-500">{forum.description}</p>}
          </div>
        </div>

        {/* New post form */}
        {userId && <NewPostForm forumSlug={slug} />}

        {/* Posts */}
        <div className="flex flex-col gap-3 mt-6">
          {forum.posts.length === 0 && (
            <p className="text-center text-gray-600 py-12">No posts yet. Be the first!</p>
          )}
          {forum.posts.map(post => (
            <Link key={post.id} href={`/forums/${slug}/${post.id}`}
              className="group flex items-start gap-4 bg-gray-800 border border-gray-700 hover:border-red-600/40 rounded-xl p-4 transition">
              <img
                src={post.author.profile?.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=dc2626&color=fff&size=40`}
                alt={post.author.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.pinned && <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">Pinned</span>}
                  <h3 className="font-semibold text-white group-hover:text-red-300 transition-colors line-clamp-1">{post.title}</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                  <span>{post.author.username}</span>
                  <span>·</span>
                  <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>·</span>
                  <span>{post._count.replies} replies</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
