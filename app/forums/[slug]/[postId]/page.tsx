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
 * Next.js 15 makes `params` a Promise, so we must `await` it before
 * destructuring the individual values.
 *
 * SERVER COMPONENT:
 * No 'use client' directive — this file runs only on the server.
 * All DB queries (Prisma calls) happen at request time before any HTML is sent
 * to the browser. This is faster and more SEO-friendly than client-side fetching.
 *
 * AUTH CHECK (soft):
 * We read the `userId` cookie to identify the current user, but we do NOT
 * redirect unauthenticated visitors — the thread is publicly readable.
 * Auth only gates the reply form at the bottom.
 *
 * SECURITY — cross-board access prevention:
 * We verify that post.forum.slug === slug. Without this check, someone could
 * visit /forums/off-topic/42 and see a post that belongs to /forums/general.
 * The double-check prevents that cross-board access and presents 404 instead.
 *
 * REPORT BUTTON:
 * ForumReportButton is a Client Component (it opens a modal) that receives
 * currentUsername so it can hide the button on your own content —
 * you shouldn't be able to report your own post or replies.
 *
 * avatar() HELPER:
 * A tiny inline function that returns the user's stored avatar URL or falls back
 * to a generated initials image from ui-avatars.com. Defined inside the component
 * so it stays co-located with its usage without polluting module scope.
 *
 * REPLY ORDERING:
 * orderBy: { createdAt: 'asc' } ensures the oldest reply is at the top and the
 * newest is at the bottom, matching how chat/forum threads read naturally.
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

// TypeScript: params is a Promise in Next.js 15+ App Router.
// Both slug (the forum board) and postId (the specific post) are string segments
// because URL segments are always strings — we parse postId to Number for Prisma.
type Props = { params: Promise<{ slug: string; postId: string }> };

export default async function ForumPostPage({ params }: Props) {
  // Destructure both dynamic segments from the URL.
  // `await` is required in Next.js 15 because params is now a Promise.
  const { slug, postId } = await params;

  // Read the session cookie to determine if a user is logged in.
  // `cookies()` is a Next.js server-only API — it reads HTTP request cookies.
  const cookieStore = await cookies();

  // Convert the cookie string to a number, default to 0 if absent.
  // `|| null` converts 0 to null so we can use simple truthiness checks later
  // (0 is falsy in JS, but is also the default for Number("") which we want to treat as "not logged in").
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Fetch the current user's username (needed by ForumReportButton to hide
  // the report button on the user's own posts/replies).
  // If not logged in (userId is null), skip the DB call and use null directly.
  const currentUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    : null;
  const currentUsername = currentUser?.username ?? null;

  // Load the post with its parent forum, author, and all replies (oldest first).
  // `findUnique` requires a unique field — `id` here — and returns null if not found.
  const post = await prisma.forumPost.findUnique({
    where: { id: Number(postId) }, // postId is a string from the URL, convert to number for Prisma
    include: {
      // include.forum: fetch the board this post belongs to (for breadcrumb + slug validation)
      forum: { select: { name: true, slug: true, icon: true } },
      // include.author: fetch the post author's username and avatar
      author: { select: { username: true, profile: { select: { avatar: true } } } },
      // include.replies: fetch all replies with their authors, sorted oldest → newest
      replies: {
        orderBy: { createdAt: 'asc' }, // oldest reply first → thread reads top-to-bottom
        include: { author: { select: { username: true, profile: { select: { avatar: true } } } } },
      },
    },
  });

  // Guard 1: post doesn't exist (invalid postId)
  // Guard 2: the URL slug doesn't match the post's actual forum slug
  //          (prevents cross-board access like /forums/off-topic/42 for a general post)
  // Both cases show a 404 so we don't leak information about what IDs exist.
  if (!post || post.forum.slug !== slug) return notFound();

  // Inline avatar helper — returns the user's avatar or a generated initials image.
  // `encodeURIComponent` ensures special characters in usernames don't break the URL.
  // `background=dc2626` matches the site's red-600 Tailwind color.
  const avatar = (username: string, av?: string | null) =>
    av ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=dc2626&color=fff&size=40`;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Main content container — max-w-3xl keeps the thread readable-width */}
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* ── Breadcrumb ──────────────────────────────────────────────── */}
        {/* Shows: Forums / Board Name / Post Title
            The post title uses line-clamp-1 to truncate if it's very long.
            Each segment is a link except the last (current page). */}
        <div className="flex items-center gap-2 mb-6 text-xs text-gray-500">
          <Link href="/forums" className="hover:text-gray-300 transition">Forums</Link>
          <span>/</span>
          {/* Link back to the board index page using the forum's slug */}
          <Link href={`/forums/${slug}`} className="hover:text-gray-300 transition">{post.forum.icon} {post.forum.name}</Link>
          <span>/</span>
          {/* Current page — not a link; truncated with line-clamp-1 if very long */}
          <span className="text-gray-400 line-clamp-1">{post.title}</span>
        </div>

        {/* ── Original post ────────────────────────────────────────────── */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <h1 className="text-xl font-bold text-white mb-4">{post.title}</h1>

          {/* Author row: avatar + username + post date */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={avatar(post.author.username, post.author.profile?.avatar)}
              alt={post.author.username}
              className="w-9 h-9 rounded-full object-cover"
            />
            <div>
              {/* Username links to the author's public profile page */}
              <Link
                href={`/user/${post.author.username}`}
                className="text-sm font-semibold text-white hover:text-red-400 transition"
              >
                {post.author.username}
              </Link>
              {/* Long-form date: "January 1, 2025" */}
              <p className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Post body — whitespace-pre-wrap preserves line breaks the user typed */}
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* Report button for the original forum post.
              ForumReportButton is a 'use client' component — it handles the
              report modal interaction. Passing currentUsername lets it hide
              itself when the viewer is the post author (can't report yourself). */}
          <div className="mt-4 flex justify-end">
            <ForumReportButton
              targetId={post.id}
              type="FORUM_POST"
              authorUsername={post.author.username}
              currentUsername={currentUsername}
            />
          </div>
        </div>

        {/* ── Replies section ──────────────────────────────────────────── */}
        {/* Only rendered when there is at least one reply */}
        {post.replies.length > 0 && (
          <div className="flex flex-col gap-4 mb-6">
            {/* Section header: "3 Replies" (singular/plural handled with ternary) */}
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {post.replies.length} {post.replies.length === 1 ? 'Reply' : 'Replies'}
            </h2>

            {/* Map over replies — each gets an avatar + bubble card */}
            {post.replies.map((reply, i) => (
              <div key={reply.id} className="flex gap-3">
                {/* Avatar sits outside the bubble on the left, aligned to the top */}
                <img
                  src={avatar(reply.author.username, reply.author.profile?.avatar)}
                  alt={reply.author.username}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
                  // flex-shrink-0 prevents the avatar from shrinking on small screens
                />

                {/* Reply bubble — flex-1 fills remaining width next to the avatar */}
                <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Author link */}
                    <Link
                      href={`/user/${reply.author.username}`}
                      className="text-sm font-semibold text-white hover:text-red-400 transition"
                    >
                      {reply.author.username}
                    </Link>
                    {/* Short date: "Jan 1" — space-efficient in the reply header */}
                    <span className="text-xs text-gray-600">
                      {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {/* Reply number (#1, #2 …) — ml-auto pushes it to the far right */}
                    <span className="ml-auto text-xs text-gray-700">#{i + 1}</span>
                  </div>

                  {/* Reply content — whitespace-pre-wrap preserves newlines */}
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

        {/* ── Reply form / login prompt ────────────────────────────────── */}
        {/* Auth gate: only logged-in users can post replies.
            userId is truthy when the session cookie exists and contains a valid number.
            ForumReplyForm is a Client Component that manages the reply textarea + submit. */}
        {userId ? (
          <ForumReplyForm postId={post.id} forumSlug={slug} />
        ) : (
          // Guest prompt — simple text link, no full redirect
          <div className="text-center py-8 text-gray-500 text-sm">
            <Link href="/login" className="text-red-400 hover:text-red-300 transition">Log in</Link> to reply
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
