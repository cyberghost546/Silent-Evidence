// app/not-found.tsx
// Custom 404 page — shown whenever a URL doesn't match any route.
// Horror-themed to stay consistent with the rest of the site.
// This is a Server Component (no 'use client' needed).

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      {/* Subtle red glow in the background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.08)_0%,_transparent_70%)] pointer-events-none" />

      <div className="relative text-center max-w-lg">

        {/* Large skull icon */}
        <div className="text-8xl mb-6 select-none">💀</div>

        {/* 404 number — big and red */}
        <h1 className="text-8xl font-black text-red-600 mb-2 leading-none">404</h1>

        {/* Tagline */}
        <h2 className="text-2xl font-bold text-white mb-4">
          This page has gone missing
        </h2>

        {/* Flavour copy */}
        <p className="text-gray-400 text-base leading-relaxed mb-8">
          Like so many unexplained disappearances, there's no trace of what you were looking for.
          It may have been moved, deleted, or it never existed at all.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm"
          >
            ← Back to Home
          </Link>
          <Link
            href="/search"
            className="w-full sm:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition text-sm"
          >
            Search Stories
          </Link>
        </div>

      </div>
    </div>
  );
}
