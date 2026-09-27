'use client';
// app/components/ui/RandomStoryButton.tsx
// "I'm feeling brave" button that fetches a random story from the API
// and navigates the user directly to that story's page.
//
// While the request is in-flight the button shows a spinning icon and
// the label changes to "Finding…" so the user knows something is happening.

import { useState } from 'react'; // useState — tracks the loading state
import { useRouter } from 'next/navigation'; // useRouter — used to navigate to the random story page

// The component takes no props — it is fully self-contained
export default function RandomStoryButton() {
  // loading — true while we are waiting for the API to return a random story slug
  const [loading, setLoading] = useState(false);

  // router — Next.js router instance used to perform a client-side navigation
  const router = useRouter();

  // go — called when the user clicks the button
  // Fetches /api/random-story, reads the slug from the JSON response,
  // then navigates to /story/<slug>.  If the request fails the button just
  // re-enables without crashing (setLoading(false) in the final line).
  const go = async () => {
    setLoading(true); // disable the button and show the spinner

    // GET /api/random-story — returns { slug: string }
    const res = await fetch('/api/random-story');

    if (res.ok) {
      // Parse the slug out of the response body
      const { slug } = await res.json();

      // Navigate the user to the randomly selected story page
      router.push(`/story/${slug}`);
    }

    // Re-enable the button whether the request succeeded or failed
    setLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <button
      onClick={go}
      disabled={loading} // prevent double-clicks while the request is in-flight
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-600/50 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
    >
      {/* Icon — bolt/lightning when idle, spinning circle while loading */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`w-4 h-4 text-red-400 ${loading ? 'animate-spin' : ''}`} // spin the icon while loading
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {loading ? (
          // Spinning arrows path — shown while waiting for the API response
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        ) : (
          // Lightning bolt path — shown in the idle state
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        )}
      </svg>

      {/* Button label swaps between idle and loading states */}
      {loading ? 'Finding…' : "I'm feeling brave"}
    </button>
  );
}
