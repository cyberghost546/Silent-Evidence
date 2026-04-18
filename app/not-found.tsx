// app/not-found.tsx
// Horror-themed 404 page with glitch effect and atmospheric fog.

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-gray-950 flex items-center justify-center px-4 overflow-hidden">

      {/* Fog layers */}
      <div className="animate-fog absolute bottom-0 left-0 w-[200%] h-48 bg-linear-to-t from-red-950/30 to-transparent blur-3xl pointer-events-none" />
      <div className="animate-fog-delayed absolute bottom-0 left-0 w-[200%] h-32 bg-linear-to-t from-gray-900/60 to-transparent blur-2xl pointer-events-none" />

      {/* Radial red glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.12)_0%,transparent_65%)] pointer-events-none" />

      {/* Scanlines overlay */}
      <div className="scanlines absolute inset-0 pointer-events-none opacity-[0.03]" />

      <div className="relative text-center max-w-xl z-10">

        {/* Glitchy 404 */}
        <div className="relative inline-block mb-6 select-none">
          {/* Ghost layers for glitch effect */}
          <span
            aria-hidden="true"
            className="animate-glitch-1 absolute inset-0 text-[9rem] md:text-[11rem] font-black leading-none"
          >404</span>
          <span
            aria-hidden="true"
            className="animate-glitch-2 absolute inset-0 text-[9rem] md:text-[11rem] font-black leading-none"
          >404</span>
          {/* Real text */}
          <span className="animate-flicker relative text-[9rem] md:text-[11rem] font-black text-red-600 leading-none">
            404
          </span>
        </div>

        {/* Skull + heading */}
        <div className="animate-float-up">
          <div className="text-5xl mb-4 select-none">💀</div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
            This page vanished without a trace
          </h1>
        </div>

        {/* Flavour copy */}
        <p className="animate-float-up-delay-1 text-gray-400 text-base leading-relaxed mb-3">
          Like so many unexplained disappearances, there&apos;s no evidence of what you were looking for.
          It may have been moved, deleted — or it never existed at all.
        </p>
        <p className="animate-float-up-delay-2 text-gray-600 text-sm italic mb-10">
          &quot;The most terrifying fact about the universe is not that it is hostile,
          but that it is indifferent.&quot; — Stanley Kubrick
        </p>

        {/* Action buttons */}
        <div className="animate-float-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            ← Back to Home
          </Link>
          <Link
            href="/search"
            className="w-full sm:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Search Stories
          </Link>
          <Link
            href="/discover"
            className="w-full sm:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Discover
          </Link>
        </div>

      </div>
    </div>
  );
}
