'use client';
// app/error.tsx
// Horror-themed error boundary page shown on unhandled route-level errors.
// Must be a Client Component to receive the error object and reset function.

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Silent Evidence] Unhandled error:', error);
  }, [error]);

  return (
    <div className="relative min-h-screen bg-gray-950 flex items-center justify-center px-4 overflow-hidden">

      {/* Fog */}
      <div className="animate-fog absolute bottom-0 left-0 w-[200%] h-48 bg-linear-to-t from-red-950/30 to-transparent blur-3xl pointer-events-none" />
      <div className="animate-fog-delayed absolute bottom-0 left-0 w-[200%] h-32 bg-linear-to-t from-gray-900/60 to-transparent blur-2xl pointer-events-none" />

      {/* Red glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.15)_0%,transparent_65%)] pointer-events-none" />

      {/* Scanlines */}
      <div className="scanlines absolute inset-0 pointer-events-none opacity-[0.03]" />

      <div className="relative text-center max-w-xl z-10">

        {/* Glitchy warning icon */}

        {/* Heading */}
        <h1 className="animate-float-up text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
          Something escaped from the shadows
        </h1>

        {/* Copy */}
        <p className="animate-float-up-delay-1 text-gray-400 text-base leading-relaxed mb-3">
          An unexpected error crept out of the dark. Our team has been alerted.
          You can try again or retreat to the homepage.
        </p>

        {/* Error digest */}
        {error.digest && (
          <p className="animate-float-up-delay-2 text-xs text-gray-700 font-mono mb-6 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 inline-block">
            Error ID: {error.digest}
          </p>
        )}

        {/* Buttons */}
        <div className="animate-float-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={reset}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Try again
          </button>
          <a
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            ← Back to Home
          </a>
        </div>

      </div>
    </div>
  );
}
