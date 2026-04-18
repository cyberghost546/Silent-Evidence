/**
 * app/forums/[slug]/[postId]/page.tsx
 *
 * WHAT THIS FILE DOES:
 * This is the individual forum thread page — it shows a single post and all
 * its replies, sorted oldest-first so the conversation flows top to bottom.
 *
 * URL STRUCTURE:
 * /forums/general/42  →  slug = "general", postId = "42"
 * Both are dynamic segments extracted from the URL via params.
 *
 * SECURITY NOTE:
 * We verify that post.forum.slug === slug. Without this check, someone could
 * visit /forums/off-topic/42 and see a post that belongs to /forums/general.
 * The double-check prevents that cross-board access.
 *
 * REPORT BUTTON:
 * ForumReportButton is a Client Component that shows a "Report" link.
 * It receives currentUsername so it can hide the button on your own content
 * (you shouldn't be able to report your own post).
 *
 * avatar() HELPER:
 * A tiny inline function that returns the avatar URL or a generated fallback.
 * Defined inside the component so it has access to the URL template without
 * needing to be imported. Fine for small helpers like this.
 *
 * HOW TO REUSE:
 * The breadcrumb + original post + threaded replies + reply form layout is
 * a classic forum thread pattern. Adapt Post/Reply model names as needed.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import ForumReplyForm from '@/app/components/ui/ForumReplyForm';
// ForumReportButton handles the report modal for posts and replies (client component)
import ForumReportButton from '@/app/components/ui/ForumReportButton';

type Props = { params: Promise<{ slug: string; postId: string }> };

export default async function ForumPostPage({ params }: Props) {
  // Destructure both dynamic segments from the URL
  const { slug, postId } = await params;
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch the current user's username (needed by ForumReportButton to hide
  // the report button on the user's own posts/replies)
  const currentUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    : null;
  const currentUsername = currentUser?.username ?? null;

  // Load the post with its parent forum, author, and all replies (oldest first)
  const post = await prisma.forumPost.findUnique({
    where: { id: Number(postId) },
    include: {
      forum: { select: { name: true, slug: true, icon: true } },
      author: { select: { username: true, profile: { select: { avatar: true } } } },
      replies: {
        orderBy: { createdAt: 'asc' }, // oldest reply first → thread reads top-to-bottom
        include: { author: { select: { username: true, profile: { select: { avatar: true } } } } },
      },
    },
  });

  // Guard: post doesn't exist, OR the URL slug doesn't match the post's forum slug
  // (prevents cross-board access like /forums/off-topic/42 for a general post)
  if (!post || post.forum.slug !== slug) return notFound();

  // Inline avatar helper — returns the user's avatar or a generated initials image
  const avatar = (username: string, av?: string | null) =>
    av ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=dc2626&color=fff&size=40`;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-xs text-gray-500">
          <Link href="/forums" className="hover:text-gray-300 transition">Forums</Link>
          <span>/</span>
          <Link href={`/forums/${slug}`} className="hover:text-gray-300 transition">{post.forum.icon} {post.forum.name}</Link>
          <span>/</span>
          <span className="text-gray-400 line-clamp-1">{post.title}</span>
        </div>

        {/* Original post */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <h1 className="text-xl font-bold text-white mb-4">{post.title}</h1>
          <div className="flex items-center gap-3 mb-4">
            <img src={avatar(post.author.username, post.author.profile?.avatar)} alt={post.author.username} className="w-9 h-9 rounded-full object-cover" />
            <div>
              <Link href={`/user/${post.author.username}`} className="text-sm font-semibold text-white hover:text-red-400 transition">{post.author.username}</Link>
              <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* Report button for the original forum post */}
          <div className="mt-4 flex justify-end">
            <ForumReportButton
              targetId={post.id}
              type="FORUM_POST"
              authorUsername={post.author.username}
              currentUsername={currentUsername}
            />
          </div>
        </div>

        {/* Replies */}
        {post.replies.length > 0 && (
          <div className="flex flex-col gap-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{post.replies.length} {post.replies.length === 1 ? 'Reply' : 'Replies'}</h2>
            {post.replies.map((reply, i) => (
              <div key={reply.id} className="flex gap-3">
                <img src={avatar(reply.author.username, reply.author.profile?.avatar)} alt={reply.author.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1" />
                <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link href={`/user/${reply.author.username}`} className="text-sm font-semibold text-white hover:text-red-400 transition">{reply.author.username}</Link>
                    <span className="text-xs text-gray-600">{new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className="ml-auto text-xs text-gray-700">#{i + 1}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{reply.content}</p>

                  {/* Report button for this individual reply */}
                  <div className="mt-2 flex justify-end">
                    <ForumReportButton
                      targetId={reply.id}
                      type="FORUM_REPLY"
                      authorUsername={reply.author.username}
                      currentUsername={currentUsername}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply form */}
        {userId ? (
          <ForumReplyForm postId={post.id} forumSlug={slug} />
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            <Link href="/login" className="text-red-400 hover:text-red-300 transition">Log in</Link> to reply
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
