// app/for-you/page.tsx
// "For You" personalised horror story feed.
// Server component — fetches the feed via the internal API route,
// then renders story cards using the same layout pattern as the Trending page.

import Link from 'next/link';
import { moodIcon } from '@/lib/moodIcons';
import { cookies } from 'next/headers';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';

export const metadata = { title: 'For You — Silent Evidence' };

// ── Types matching what /api/stories/for-you returns ─────────────────────────
type Author = {
  username: string;
  isVerified: boolean;
  profile: { avatar: string | null } | null;
};

type Category = { name: string; slug: string };

type FeedStory = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  mood: string | null;
  views: number;
  createdAt: string;
  author: Author;
  category: Category;
  _count: { likes: number; comments: number };
};

// Mood emoji map — adds visual flavour to mood badges
// Mood icons come from the shared lib/moodIcons map so every page agrees.

// Format large numbers — 12400 → "12.4k"
function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default async function ForYouPage() {
  // Check if the user is logged in by reading the session cookie server-side
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  // ── Not logged in — show a sign-in prompt instead of the feed ──────────────
  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-900 text-white">
        <Header />

        {/* Sign-in prompt */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-3">
            Your Personalised Feed Awaits
          </h1>
          <p className="text-gray-400 max-w-md mb-8">
            Sign in to get horror stories tailored to your fear profile — based
            on the authors you follow and the moods that haunt you.
          </p>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 rounded-full border border-gray-600 text-gray-300 font-semibold hover:border-gray-400 hover:text-white transition"
            >
              Create Account
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

  // ── Logged in — fetch the personalised story feed ──────────────────────────
  // We call the API route internally (server → server fetch via absolute URL).
  // Using the full origin from the environment variable for compatibility with
  // different deployment environments.
  let stories: FeedStory[] = [];

  try {
    // Build the absolute URL for the internal API call
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stories/for-you`, {
      // Forward the session cookie so the route can authenticate the request
      headers: {
        Cookie: cookieStore.toString(),
      },
      // Revalidate every 5 minutes — the feed doesn't need to be real-time
      next: { revalidate: 300 },
    });

    if (res.ok) {
      stories = await res.json();
    }
  } catch {
    // Silently fail — an empty feed is shown below instead of crashing
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />

      {/* Page hero */}
      <div className="relative bg-gray-950 border-b border-gray-800 py-12">
        {/* Subtle red radial glow in the background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(220,38,38,0.12)_0%,transparent_70%)]" />
        <div className="max-w-5xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-extrabold text-white">For You</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Personalised for your fear profile — stories by authors you follow
            and moods that match your taste.
          </p>
        </div>
      </div>

      {/* Story list */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {stories.length === 0 ? (
          // Empty state — shown when the feed has no results
          <div className="text-center py-24 text-gray-500">
            <p className="mb-2">Your feed is empty.</p>
            <p className="text-sm">
              Follow some authors or set your{' '}
              <Link href="/settings" className="text-red-400 hover:underline">
                fear profile
              </Link>{' '}
              to get personalised stories.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/story/${story.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800 transition-all duration-200 overflow-hidden"
              >
                {/* Cover thumbnail — hidden on small screens */}
                <div className="hidden sm:block w-20 h-20 flex-shrink-0 rounded-l-2xl overflow-hidden bg-gray-800">
                  {story.coverImage ? (
                    <img
                      src={story.coverImage}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    // Gradient placeholder when no cover image is set
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    </div>
                  )}
                </div>

                {/* Main story info */}
                <div className="flex-1 min-w-0 py-4 pr-4">
                  {/* Category + mood badge row */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* Category pill */}
                    <span
                      onClick={(e) => e.preventDefault()} // prevent card link from firing
                      className="text-xs text-red-400 font-medium"
                    >
                      <Link
                        href={`/category/${story.category.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-red-300 transition"
                      >
                        {story.category.name}
                      </Link>
                    </span>

                    {/* Mood badge — only shown if a mood is set */}
                    {story.mood && (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                        {(() => {
                          const MoodIcon = moodIcon(story.mood);
                          return <MoodIcon className="w-3 h-3" strokeWidth={1.75} aria-hidden="true" />;
                        })()}
                        {story.mood.charAt(0) + story.mood.slice(1).toLowerCase()}
                      </span>
                    )}
                  </div>

                  {/* Story title */}
                  <h2 className="text-white font-semibold text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-red-300 transition">
                    {story.title}
                  </h2>

                  {/* Excerpt — shown when available */}
                  {story.excerpt && (
                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">
                      {story.excerpt}
                    </p>
                  )}

                  {/* Author + stats row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {/* Author avatar + name */}
                    <div className="flex items-center gap-1.5">
                      <img
                        src={
                          story.author.profile?.avatar ??
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=dc2626&color=fff&size=32`
                        }
                        alt={story.author.username}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="text-xs text-gray-400">{story.author.username}</span>
                      {/* Blue verified checkmark for verified authors */}
                      {story.author.isVerified && (
                        <svg className="w-3 h-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Separator dot */}
                    <span className="w-1 h-1 rounded-full bg-gray-700 flex-shrink-0" />

                    {/* View count */}
                    <span className="text-xs text-gray-500">{fmtNum(story.views)}</span>

                    {/* Like count */}
                    <span className="text-xs text-gray-500">{fmtNum(story._count.likes)}</span>

                    {/* Comment count */}
                    <span className="text-xs text-gray-500">{story._count.comments}</span>
                  </div>
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
