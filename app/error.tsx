'use client';
// app/error.tsx
// Custom error boundary page — shown when an unhandled error occurs at the route level.
// Must be a Client Component so it can receive the error object and use the reset function.
// Horror-themed to stay consistent with the rest of the site.

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void; // Call this to attempt to re-render the segment
}

export default function Error({ error, reset }: ErrorProps) {
  // Log the error to the console so developers can see it
  useEffect(() => {
    console.error('[Silent Evidence] Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      {/* Subtle red glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.08)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative text-center max-w-lg">

        {/* Warning icon */}
        <div className="text-8xl mb-6 select-none">⚠️</div>

        {/* Heading */}
        <h1 className="text-3xl font-black text-white mb-3">
          Something went wrong
        </h1>

        {/* Flavour copy */}
        <p className="text-gray-400 text-base leading-relaxed mb-8">
          An unexpected error crept out of the shadows. Our team has been notified.
          You can try again or head back to the homepage.
        </p>

        {/* Error digest — small technical hint for debugging, hidden from casual users */}
        {error.digest && (
          <p className="text-xs text-gray-700 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* reset() re-renders the route segment — often fixes transient errors */}
          <button
            type="button"
            onClick={reset}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm"
          >
            Try again
          </button>
          <a
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition text-sm"
          >
            ← Back to Home
          </a>
        </div>

      </div>
    </div>
  );
}
