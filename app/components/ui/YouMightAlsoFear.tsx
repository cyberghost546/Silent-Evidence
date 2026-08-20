// app/components/ui/YouMightAlsoFear.tsx
// Personalised recommendation section shown at the bottom of every story page.
// Fetches from /api/recommendations — logged-in users get personalised picks
// based on their fear profile, liked moods/categories, and follow graph.
// Logged-out users get popular stories in the same mood / category.

import Link from 'next/link';
import { cookies } from 'next/headers';

// Shape returned by the recommendations API
type RecommendedStory = {
  id:          number;
  title:       string;
  slug:        string;
  coverImage:  string | null;
  excerpt:     string | null;
  mood:        string | null;
  category:    { name: string } | null;
  author:      { username: string };
  _count:      { likes: number };
};

type Props = {
  currentStoryId: number;
  mood:           string | null;
  categoryId:     number;
};

export default async function YouMightAlsoFear({ currentStoryId, mood, categoryId }: Props) {
  // Read the cookie on the server so the API can personalise results
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  let stories: RecommendedStory[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/stories/${currentStoryId}/recommendations`, {
      headers: { cookie: cookieHeader },
      next: { revalidate: 300 },
    });
    if (res.ok) stories = await res.json();
  } catch {
    // Network error — silently hide the section
  }

  if (stories.length === 0) return null;

  return (
    <section className="mt-12 pt-10 border-t border-gray-800">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-5 bg-red-600 rounded-full" />
        <h2 className="text-lg font-bold text-white">You Might Also Fear</h2>
        <span className="text-xs text-gray-600 ml-auto">personalised picks</span>
      </div>

      {/* Story card grid — 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stories.map(s => (
          <Link
            key={s.id}
            href={`/story/${s.slug}`}
            className="group bg-gray-800 border border-gray-700 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(220,38,38,0.1)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.35)]"
          >
            {/* Cover thumbnail */}
            <div className="h-28 overflow-hidden">
              {s.coverImage ? (
                <img
                  src={s.coverImage}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                // Placeholder gradient when no cover image
                <div className="w-full h-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="p-2.5">
              {/* Mood / category pill */}
              {(s.mood || s.category) && (
                <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1 truncate">
                  {s.mood ?? s.category?.name}
                </p>
              )}

              {/* Story title */}
              <p className="text-xs font-semibold text-white group-hover:text-red-300 transition line-clamp-2 leading-snug">
                {s.title}
              </p>

              {/* Author + like count */}
              <p className="text-[10px] text-gray-500 mt-1.5 truncate">
                {s.author.username} · {s._count.likes}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
