// app/profile/[username]/page.tsx
//
// Server Component — public author profile page at /profile/:username.
//
// WHAT THIS PAGE SHOWS:
//   • Hero banner with the user's chosen theme colour
//   • Avatar, username, join date, follow/dashboard button
//   • Sidebar: bio, website, stats grid (stories/followers/following/views/likes),
//     fear-mood profile tags, reading stats
//   • Main area: pinned story card + grid of all other published stories
//
// KEY DATA PATTERNS:
//   1. The main user query uses nested `include` to fetch the profile, stories,
//      and their social counts all in one DB round-trip. This avoids N+1 queries.
//   2. Reading stats (history count, streak, top moods) are fetched in parallel via
//      Promise.all — total wait = max(query1, query2, query3) not their sum.
//   3. `isOwnProfile` compares cookie userId with the profile's userId — controls
//      which buttons appear (Edit/Dashboard vs Follow).
//   4. `isFollowing` is only queried when the viewer is logged in AND viewing
//      someone else. We short-circuit with `false` otherwise to save a DB round-trip.
//   5. `favMood` is derived by counting mood occurrences in the last 100 reading
//      history records — a simple frequency map, no DB GROUP BY needed.
import { notFound }  from 'next/navigation';
import { cookies }   from 'next/headers';
import Link          from 'next/link';
import Image         from 'next/image';
import { prisma }    from '@/lib/prisma';
import Header        from '@/app/components/ui/Header';
import Footer        from '@/app/components/ui/Footer';
import UserAvatar    from '@/app/components/ui/UserAvatar';
import { readingTime } from '@/lib/readingTime';
import { getTheme } from '@/app/lib/themes';

type Props = { params: Promise<{ username: string }> };

// fmt() formats large numbers compactly: 1234 → "1.2k", 999 → "999".
// Used in the stats grid so big follower/view counts don't overflow their cells.
function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// MOOD_COLORS maps each horror-genre mood value to a Tailwind colour set.
// The `/10` and `/20` opacity modifiers give translucent coloured backgrounds
// that sit nicely on the dark gray card backgrounds.
const MOOD_COLORS: Record<string, string> = {
  GOTHIC:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  PARANORMAL:  'bg-blue-500/10   text-blue-400   border-blue-500/20',
  COSMIC:      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  SLASHER:     'bg-red-500/10    text-red-400    border-red-500/20',
  PSYCHOLOGICAL:'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  SUPERNATURAL:'bg-cyan-500/10   text-cyan-400   border-cyan-500/20',
};

export default async function ProfilePage({ params }: Props) {
  // In Next.js 14 App Router, `params` is a Promise — must be awaited
  const { username } = await params;

  // ── Main user query ──────────────────────────────────────────────────────
  // One Prisma query fetches the user + profile + stories + social counts.
  // `include: { _count }` counts related records without loading them all —
  // the same as SELECT COUNT(*) in SQL but written declaratively.
  const user = await prisma.user.findUnique({
    where:   { username },
    include: {
      profile: true,                       // bio, avatar, website, theme, etc.
      stories: {
        where:   { status: 'PUBLISHED' },  // only show public stories
        orderBy: { createdAt: 'desc' },    // newest first
        include: {
          category: { select: { name: true, slug: true } },
          _count:   { select: { likes: true, comments: true } },
        },
      },
      _count: {
        select: {
          stories:   { where: { status: 'PUBLISHED' } }, // for the story-count badge
          followers: true,
          following:  true,
        },
      },
    },
  });

  // `notFound()` renders Next.js' built-in 404 page
  if (!user) return notFound();

  // ── Reading stats (parallel) ──────────────────────────────────────────────
  // Three independent DB queries run simultaneously via Promise.all.
  const [readCount, streak, topMoods] = await Promise.all([
    prisma.readingHistory.count({ where: { userId: user.id } }),
    prisma.readingStreak.findUnique({ where: { userId: user.id } }),
    // Last 100 reads — enough to calculate a representative mood preference
    prisma.readingHistory.findMany({
      where: { userId: user.id },
      select: { story: { select: { mood: true } } },
      take: 100,
      orderBy: { readAt: 'desc' },
    }),
  ]);

  // ── Derive favourite mood ─────────────────────────────────────────────────
  // Build a frequency map: { GOTHIC: 12, SLASHER: 8, … }, then find the top entry.
  const moodFreqMap = new Map<string, number>();
  for (const h of topMoods) {
    if (h.story?.mood) moodFreqMap.set(h.story.mood, (moodFreqMap.get(h.story.mood) ?? 0) + 1);
  }
  const favMood = [...moodFreqMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // ── Viewer identity ───────────────────────────────────────────────────────
  const cookieStore  = await cookies();
  const loggedInId   = Number(cookieStore.get('userId')?.value ?? 0);
  // isOwnProfile determines whether to show the Edit/Dashboard button vs Follow
  const isOwnProfile = loggedInId === user.id;

  // Only check the Follow table when needed — short-circuit saves a DB round-trip
  const isFollowing = loggedInId && !isOwnProfile
    ? !!(await prisma.follow.findFirst({ where: { followerId: loggedInId, followingId: user.id } }))
    : false;

  // ── Derived display values ────────────────────────────────────────────────
  // Fall back to ui-avatars.com for users without an uploaded avatar
  const avatar = user.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=dc2626&color=fff&size=256`;

  const joinYear = new Date(user.createdAt).getFullYear();
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  // getTheme() returns Tailwind class strings for the hero gradient
  const theme           = getTheme(user.profile?.profileTheme ?? 'default');
  // Find the pinned story in the already-fetched array — no extra DB query
  const pinnedStory     = user.pinnedStoryId ? (user.stories.find(s => s.id === user.pinnedStoryId) ?? null) : null;
  // Exclude the pinned story from the main grid so it doesn't appear twice
  const unpinnedStories = pinnedStory ? user.stories.filter(s => s.id !== pinnedStory.id) : user.stories;
  // Totals computed from the already-fetched stories array — no extra DB query
  const totalLikes      = user.stories.reduce((s, st) => s + st._count.likes, 0);
  const totalViews      = user.stories.reduce((s, st) => s + st.views, 0);
  // fearMoods is stored as a comma-separated string: "GOTHIC,SLASHER" → ["GOTHIC", "SLASHER"]
  const fearMoods       = user.profile?.fearMoods?.split(',').filter(Boolean) ?? [];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div className="relative h-56 sm:h-72 overflow-hidden bg-gray-900">
        {/* layered gradients — colour driven by user's chosen theme */}
        <div className={`absolute inset-0 bg-linear-to-br ${theme.hero}`} />
        <div className={`absolute inset-0 ${theme.heroRadial}`} />
        <div className="absolute inset-0 opacity-[0.04] profile-banner-grid" />
        {/* bottom fade to page bg */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-gray-950" />

        {/* Author badge top-left */}
        <div className="absolute top-5 left-6 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-500/30 bg-red-500/10 text-red-400 backdrop-blur-sm">
            {user.role === 'ADMIN' ? 'Admin' : 'Author'}
          </span>
          {user.isVerified && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-400 backdrop-blur-sm flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.492 4.492 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
        </div>

        {/* Edit button for own profile */}
        {isOwnProfile && (
          <Link href="/settings"
            className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white backdrop-blur-sm transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Edit Profile
          </Link>
        )}

        {/* Member since — bottom right */}
        <p className="absolute bottom-5 right-5 text-[10px] text-gray-600 font-medium tracking-wide">
          Member since {joinYear}
        </p>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">

        {/* Avatar + name strip */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 mb-8">
          {/* Avatar — theme colour + optional border animation */}
          <UserAvatar
            src={avatar}
            username={user.username}
            size={128}
            theme={user.profile?.profileTheme ?? 'default'}
            border={user.profile?.avatarBorder ?? 'none'}
            className="self-start sm:self-auto"
          />

          {/* Name block */}
          <div className="flex-1 sm:pb-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight truncate">
              {user.username}
            </h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
              Joined {joinDate}
            </p>
          </div>

          {/* CTA button */}
          <div className="shrink-0 sm:pb-1">
            {isOwnProfile ? (
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                Dashboard
              </Link>
            ) : loggedInId ? (
              <form action={`/api/follow/${user.id}`} method="POST">
                <button type="submit"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border transition ${
                    isFollowing
                      ? 'bg-transparent border-gray-700 text-gray-400 hover:border-red-600/60 hover:text-red-400'
                      : 'bg-red-600 border-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30'
                  }`}>
                  {isFollowing ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Following
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Follow
                    </>
                  )}
                </button>
              </form>
            ) : (
              <Link href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 border border-red-600 text-white shadow-lg shadow-red-900/30 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Follow
              </Link>
            )}
          </div>
        </div>

        {/* ── Two-column layout on desktop ──────────────────────────────────── */}
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10 mb-16">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
          <aside className="mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-24 space-y-5">

              {/* Bio */}
              {user.profile?.bio && (
                <p className="text-sm text-gray-400 leading-relaxed">
                  {user.profile.bio}
                </p>
              )}

              {/* Website */}
              {user.profile?.website && (
                <a href={user.profile.website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition break-all">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  {user.profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Stories',   value: fmt(user._count.stories),   icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
                  { label: 'Followers', value: fmt(user._count.followers), icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
                  { label: 'Following', value: fmt(user._count.following), icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
                  { label: 'Views',     value: fmt(totalViews),            icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                  { label: 'Likes',     value: fmt(totalLikes),            icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-1">
                    <p className="text-lg font-bold text-white leading-none">{value}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Fear Moods */}
              {fearMoods.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">Fear Profile</p>
                  <div className="flex flex-wrap gap-1.5">
                    {fearMoods.map(mood => (
                      <span key={mood}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${MOOD_COLORS[mood] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {mood.charAt(0) + mood.slice(1).toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reading Stats */}
              {(readCount > 0 || streak) && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Reading Stats</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-xl font-extrabold text-white">{fmt(readCount)}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Stories Read</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-xl font-extrabold text-white">
                        {streak?.currentStreak ?? 0}
                        <span className="text-sm font-normal text-gray-500">d</span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Current Streak</p>
                    </div>
                  </div>

                  {streak && streak.longestStreak > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Best streak</span>
                      <span className="text-amber-400 font-semibold">🔥 {streak.longestStreak} days</span>
                    </div>
                  )}

                  {favMood && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Favourite mood</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${MOOD_COLORS[favMood] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {favMood.charAt(0) + favMood.slice(1).toLowerCase()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* ── RIGHT — Stories ─────────────────────────────────────────────── */}
          <section>

            {/* Pinned story */}
            {pinnedStory && (
              <div className="mb-7">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.625 3.75a2.625 2.625 0 100 5.25h12.75a2.625 2.625 0 000-5.25H5.625zM3.25 11.763a1.125 1.125 0 011.125-1.013h15.25a1.125 1.125 0 011.125 1.013l.75 12a1.125 1.125 0 01-1.125 1.237H4.625a1.125 1.125 0 01-1.125-1.237l.75-12z" />
                  </svg>
                  Pinned
                </p>
                <Link href={`/story/${pinnedStory.slug}`}
                  className="group flex gap-4 bg-gray-900 border border-red-600/20 hover:border-red-600/50 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-red-950/30">
                  {pinnedStory.coverImage ? (
                    <Image src={pinnedStory.coverImage} alt={pinnedStory.title}
                      width={80} height={80} className="rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-red-950 to-gray-800 shrink-0 flex items-center justify-center">
                      <svg className="w-7 h-7 text-red-600/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">{pinnedStory.category.name}</span>
                    <h3 className="text-sm font-semibold text-white group-hover:text-red-400 transition mt-0.5 line-clamp-2 leading-snug">{pinnedStory.title}</h3>
                    {pinnedStory.excerpt && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{pinnedStory.excerpt}</p>}
                  </div>
                </Link>
              </div>
            )}

            {/* Stories header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Stories
                <span className="text-xs font-normal text-gray-600 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
                  {user._count.stories}
                </span>
              </h2>
              {isOwnProfile && (
                <Link href="/write"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-900/30 transition">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Story
                </Link>
              )}
            </div>

            {/* Empty state */}
            {user.stories.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-gray-800 rounded-2xl bg-gray-900/40">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-300">No stories yet</p>
                <p className="text-xs text-gray-600 mt-1.5">
                  {isOwnProfile ? 'Share your first dark tale with the world.' : `${user.username} hasn't published anything yet.`}
                </p>
                {isOwnProfile && (
                  <Link href="/write"
                    className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-900/30 transition">
                    Start writing
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {unpinnedStories.map(story => (
                  <Link key={story.id} href={`/story/${story.slug}`}
                    className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-red-600/40 hover:shadow-xl hover:shadow-red-950/20 transition-all duration-300 flex flex-col">

                    {story.coverImage ? (
                      <div className="relative h-44 overflow-hidden">
                        <Image src={story.coverImage} alt={story.title}
                          fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-black/50 text-red-400 backdrop-blur-sm border border-red-500/20">
                          {story.category.name}
                        </span>
                      </div>
                    ) : (
                      <div className="px-4 pt-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                          {story.category.name}
                        </span>
                      </div>
                    )}

                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors leading-snug line-clamp-2">
                        {story.title}
                      </h3>
                      {story.excerpt && (
                        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">
                          {story.excerpt}
                        </p>
                      )}
                      <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1 hover:text-red-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                          {fmt(story._count.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                          </svg>
                          {story._count.comments}
                        </span>
                        <span className="flex items-center gap-1 ml-auto text-gray-700">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {readingTime(story.content ?? '')}
                        </span>
                        <time className="text-gray-700">
                          {new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </time>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
