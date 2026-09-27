// app/components/ui/DeathCounter.tsx
// Server component — queries the total chapter/episode count across all published stories
// and renders a stylish animated horror stat for the homepage.
// No "use client" directive — this runs entirely on the server.

import { prisma } from '@/lib/prisma';

export default async function DeathCounter() {
  // Aggregate the deathCount field (used as chapter count) across every published story.
  // prisma.story.aggregate returns an object shaped like: { _sum: { deathCount: number | null } }
  // The value is null when no published stories exist yet, so we fall back to 0.
  const result = await prisma.story.aggregate({
    _sum: { deathCount: true },
    where: { status: 'PUBLISHED' },
  });

  // Safely coerce null to 0
  const total: number = result._sum.deathCount ?? 0;

  // Format the number with thousands separators (e.g. 4200 → "4,200")
  const formatted = total.toLocaleString('en-US');

  return (
    <section className="max-w-6xl mx-auto px-4 pb-14">
      {/* Outer container — dark card with a green pulse glow on hover */}
      <div
        className="
          relative overflow-hidden rounded-2xl border border-green-900/40 bg-gray-950
          shadow-[0_0_40px_rgba(124,58,237,0.12)]
          flex flex-col sm:flex-row items-center justify-center gap-6
          py-10 px-8 text-center sm:text-left
        "
      >
        {/* Subtle radial green glow in the background — purely decorative */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.06)_0%,_transparent_70%)] pointer-events-none" />

        {/* Book icon — large, softly glowing green */}
        <span
          className="
            text-6xl sm:text-7xl
            drop-shadow-[0_0_18px_rgba(124,58,237,0.7)]
            select-none
          "
          aria-hidden="true"
        ></span>

        {/* Text content */}
        <div className="relative z-10">
          {/* The animated number — CSS animation pulses the green glow */}
          <p
            className="
              text-4xl sm:text-5xl font-extrabold tracking-tight
              text-green-500
              drop-shadow-[0_0_12px_rgba(124,58,237,0.6)]
              animate-pulse
            "
          >
            {formatted}
          </p>

          {/* Explanatory label below the number */}
          <p className="mt-2 text-base sm:text-lg text-gray-400 font-medium">
            chapters written across all stories
          </p>

          {/* Small flavour text in the site's encouraging voice */}
          <p className="mt-1 text-xs text-gray-600 italic">
            …and counting. The adventure continues.
          </p>
        </div>
      </div>
    </section>
  );
}
