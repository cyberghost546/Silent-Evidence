// app/profile/[username]/page.tsx
// Public profile page — anyone can view a user's profile at /profile/:username.
//
// Shows the user's avatar, bio, website, stats (story count, likes, comments),
// and a grid of all their published stories.
//
// If the viewer IS the profile owner (detected by comparing cookies to the user ID),
// extra UI is shown:
//   - An "Edit Profile" button in the banner
//   - A "New Story" button in the stories section
//   - A custom empty-state CTA to write their first story
//
// This is a server component — all data is fetched before the page is sent to the browser.

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';

type Props = { params: Promise<{ username: string }> };

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  // Fetch the user and everything we need to render the page in one query.
  // We only include PUBLISHED stories — drafts and archived stories stay private.
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profile: true, // bio, avatar, website
      stories: {
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true, slug: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
      // Aggregate counts for the stats row (total stories, likes received, comments made)
      _count: { select: { stories: true, likes: true, comments: true } },
    },
  });

  if (!user) return notFound();

  // Compare the logged-in user's ID to the profile owner's ID.
  // If they match, this person is viewing their own profile.
  const cookieStore = await cookies();
  const loggedInId = Number(cookieStore.get('userId')?.value ?? 0);
  const isOwnProfile = loggedInId === user.id;

  // If the user hasn't uploaded an avatar, generate an initials avatar using ui-avatars.com.
  // The red background matches the site's colour scheme.
  const avatar =
    user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=22c55e&color=fff&size=128`;

  // Format the join date in a friendly way: "March 4, 2024"
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* ── Banner ─────────────────────────────────────────────────────── */}
      <div className="relative h-52 overflow-hidden">
        {/* Layered gradient for a more dramatic look */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/60 via-gray-900 to-gray-950" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
        {/* Decorative glow circles */}
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-red-700/20 rounded-full blur-3xl" />
        <div className="absolute top-0 right-20 w-48 h-48 bg-red-900/20 rounded-full blur-2xl" />

        {/* Edit profile button */}
        {isOwnProfile && (
          <Link
            href="/settings"
            className="absolute top-4 right-4 px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </Link>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">

        {/* ── Avatar + name ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 mb-8">
          {/* Avatar with red ring */}
          <div className="relative flex-shrink-0">
            <img
              src={avatar}
              alt={user.username}
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-950 shadow-2xl shadow-black/60"
            />
            {/* Red ring around avatar */}
            <div className="absolute inset-0 rounded-full ring-2 ring-red-600/70 ring-offset-2 ring-offset-gray-950" />
          </div>

          {/* Name + meta */}
          <div className="sm:mb-2 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{user.username}</h1>
              {/* Role badge */}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest bg-red-600/20 text-red-400 border border-red-600/30">
                {user.role.toLowerCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
              </svg>
              Member since {joinDate}
            </p>
          </div>
        </div>

        {/* ── Bio + website ────────────────────────────────────────────── */}
        {(user.profile?.bio || user.profile?.website) && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 mb-6 backdrop-blur-sm">
            {user.profile?.bio && (
              <p className="text-gray-300 leading-relaxed">{user.profile.bio}</p>
            )}
            {user.profile?.website && (
              <a
                href={user.profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-red-400 hover:text-red-300 transition"
              >
                🔗 {user.profile.website}
              </a>
            )}
          </div>
        )}

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard icon="📖" label="Stories" value={user._count.stories} />
          <StatCard icon="❤️" label="Likes" value={user._count.likes} />
          <StatCard icon="💬" label="Comments" value={user._count.comments} />
        </div>

        {/* ── Stories section ───────────────────────────────────────────── */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">Stories</h2>
              <div className="h-px w-32 bg-gradient-to-r from-red-600/50 to-transparent" />
            </div>
            {/* Write button — only shown to the profile owner */}
            {isOwnProfile && (
              <Link
                href="/write"
                className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Story
              </Link>
            )}
          </div>

          {user.stories.length === 0 ? (
            // ── Empty state ───────────────────────────────────────────────
            <div className="text-center py-20 bg-gray-900/40 border border-gray-800 border-dashed rounded-2xl">
              <p className="text-5xl mb-4">🕯️</p>
              <p className="text-gray-300 font-medium text-lg">No stories yet</p>
              <p className="text-gray-500 text-sm mt-1 mb-6">
                {isOwnProfile
                  ? 'Share your first dark tale with the community.'
                  : `${user.username} hasn't published anything yet.`}
              </p>
              {/* CTA only shown to the profile owner */}
              {isOwnProfile && (
                <Link
                  href="/write"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  ✏️ Write your first story
                </Link>
              )}
            </div>
          ) : (
            // ── Story grid ────────────────────────────────────────────────
            <div className="grid gap-5 sm:grid-cols-2">
              {user.stories.map((story) => (
                <Link
                  key={story.id}
                  href={`/story/${story.slug}`}
                  className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-red-600/50 hover:shadow-xl hover:shadow-red-950/30 transition-all duration-200"
                >
                  {story.coverImage ? (
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={story.coverImage}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
                      <span className="absolute bottom-3 left-4 text-xs text-red-400 font-semibold uppercase tracking-wide">
                        {story.category.name}
                      </span>
                    </div>
                  ) : (
                    <div className="h-12 bg-gradient-to-r from-red-950/40 to-gray-800 flex items-end px-4 pb-2">
                      <span className="text-xs text-red-400 font-semibold uppercase tracking-wide">
                        {story.category.name}
                      </span>
                    </div>
                  )}

                  <div className="p-4">
                    <h3 className="font-semibold text-white group-hover:text-red-400 transition leading-snug">
                      {story.title}
                    </h3>
                    {story.excerpt && (
                      <p className="mt-1.5 text-sm text-gray-400 line-clamp-2 leading-relaxed">
                        {story.excerpt}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                      <span>❤️ {story._count.likes}</span>
                      <span>💬 {story._count.comments}</span>
                      <span className="ml-auto">
                        {new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ── StatCard — reusable stat tile used in the profile stats row ───────────────
// Displays a single metric (e.g. "14 Stories") with an emoji icon above it.
// Kept as a separate component to avoid repeating the same markup three times.
function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 text-center hover:border-red-600/30 transition backdrop-blur-sm">
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{label}</p>
    </div>
  );
}
