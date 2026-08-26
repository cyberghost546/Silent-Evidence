// app/loading.tsx
// Shown automatically by Next.js while the homepage server component loads.
// Mirrors the real homepage layout so the page feels instant — no blank flash.

function S({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`} />;
}

export default function HomeLoading() {
  return (
    <div className="bg-gray-900 text-white min-h-screen overflow-hidden">
      {/* ── Header ── */}
      <div className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-6 h-16 flex items-center justify-between gap-4">
        <S className="h-7 w-36 rounded-lg" />
        <div className="hidden md:flex items-center gap-6">
          <S className="h-4 w-16" />
          <S className="h-4 w-16" />
          <S className="h-4 w-20" />
          <S className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-3">
          <S className="h-9 w-48 rounded-full" />
          <S className="h-9 w-9 rounded-full" />
          <S className="h-9 w-9 rounded-full" />
        </div>
      </div>

      {/* ── Writing Prompt Banner ── */}
      <div className="bg-gray-800/50 border-b border-gray-700 px-6 py-3 flex items-center gap-3">
        <S className="h-4 w-4 rounded-full" />
        <S className="h-3 w-72" />
        <S className="h-3 w-24 ml-auto" />
      </div>

      {/* ── Hero Slideshow ── */}
      <S className="w-full h-[420px] md:h-[520px] rounded-none" />

      <div className="max-w-6xl mx-auto px-4 space-y-14 py-10">
        {/* ── Featured Stories ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <S className="h-6 w-44" />
            <S className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden"
              >
                <S className="w-full h-48 rounded-none" />
                <div className="p-4 space-y-2">
                  <S className="h-3 w-20" />
                  <S className="h-5 w-full" />
                  <S className="h-5 w-3/4" />
                  <div className="flex gap-2 pt-1">
                    <S className="h-3 w-16" />
                    <S className="h-3 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Videos ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <S className="h-6 w-36" />
            <S className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden"
              >
                <S className="w-full h-40 rounded-none" />
                <div className="p-3 space-y-2">
                  <S className="h-4 w-full" />
                  <S className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Story of the Day ── */}
        <section>
          <S className="h-6 w-40 mb-5" />
          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden flex flex-col md:flex-row">
            <S className="w-full md:w-80 h-56 md:h-auto rounded-none shrink-0" />
            <div className="p-6 flex-1 space-y-3">
              <S className="h-3 w-24" />
              <S className="h-7 w-3/4" />
              <S className="h-7 w-1/2" />
              <S className="h-4 w-full" />
              <S className="h-4 w-5/6" />
              <S className="h-4 w-4/6" />
              <div className="flex gap-3 pt-2">
                <S className="h-9 w-28 rounded-full" />
                <S className="h-9 w-9 rounded-full" />
                <S className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Story of the Week (compact) ── */}
        <section>
          <S className="h-6 w-44 mb-5" />
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex gap-4">
            <S className="w-24 h-24 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <S className="h-3 w-20" />
              <S className="h-5 w-3/4" />
              <S className="h-4 w-full" />
              <S className="h-4 w-2/3" />
            </div>
          </div>
        </section>

        {/* ── Challenge Banner ── */}
        <S className="h-32 w-full rounded-2xl" />

        {/* ── Pick of Month + Writer of Month side by side ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-3">
            <S className="h-5 w-40" />
            <S className="w-full h-48 rounded-xl" />
            <S className="h-4 w-3/4" />
            <S className="h-4 w-1/2" />
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex gap-4">
            <S className="w-20 h-20 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <S className="h-5 w-36" />
              <S className="h-4 w-full" />
              <S className="h-4 w-2/3" />
              <S className="h-8 w-28 rounded-full mt-2" />
            </div>
          </div>
        </div>

        {/* ── Story Battle ── */}
        <section>
          <S className="h-6 w-36 mb-5" />
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 space-y-3 w-full">
              <S className="w-full h-40 rounded-xl" />
              <S className="h-5 w-3/4" />
              <S className="h-9 w-full rounded-full" />
            </div>
            <div className="shrink-0 flex flex-col items-center gap-2">
              <S className="h-10 w-10 rounded-full" />
              <S className="h-4 w-8" />
            </div>
            <div className="flex-1 space-y-3 w-full">
              <S className="w-full h-40 rounded-xl" />
              <S className="h-5 w-3/4" />
              <S className="h-9 w-full rounded-full" />
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <section>
          <S className="h-6 w-32 mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <S key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </section>

        {/* ── Follow Suggestions ── */}
        <section>
          <S className="h-5 w-40 mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                <S className="h-14 w-14 rounded-full" />
                <S className="h-3 w-16" />
                <S className="h-7 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* ── Main Grid: Latest Stories + Sidebar ── */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
          {/* Latest Stories */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <S className="h-6 w-36" />
              <S className="h-4 w-24" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden flex gap-0"
              >
                <S className="w-32 h-28 rounded-none shrink-0" />
                <div className="flex-1 p-4 space-y-2">
                  <S className="h-3 w-20" />
                  <S className="h-5 w-full" />
                  <S className="h-4 w-2/3" />
                  <div className="flex gap-3 pt-1">
                    <S className="h-3 w-16" />
                    <S className="h-3 w-10" />
                    <S className="h-3 w-10" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
              <S className="h-5 w-32" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <S className="h-6 w-6 rounded shrink-0" />
                  <S className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <S className="h-3 w-full" />
                    <S className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
            {/* Tip Leaderboard */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
              <S className="h-5 w-36" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <S className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <S className="h-3 w-24" />
                    <S className="h-3 w-16" />
                  </div>
                  <S className="h-5 w-12" />
                </div>
              ))}
            </div>
            {/* Calendar */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
              <S className="h-5 w-28" />
              <div className="grid grid-cols-7 gap-1">
                {[...Array(35)].map((_, i) => (
                  <S key={i} className="h-7 rounded" />
                ))}
              </div>
            </div>
            {/* Villain of Week */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
              <S className="h-5 w-40" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <S className="h-4 w-3/4" />
                    <S className="h-3 w-1/2" />
                  </div>
                  <S className="h-8 w-16 rounded-full" />
                </div>
              ))}
            </div>
            {/* Quote of Day */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-3">
              <S className="h-4 w-36" />
              <S className="h-3 w-full" />
              <S className="h-3 w-full" />
              <S className="h-3 w-4/5" />
              <S className="h-3 w-24 mt-2" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Trending Tags Strip ── */}
      <div className="border-y border-gray-800 bg-gray-800/20 px-6 py-4 flex gap-3 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <S key={i} className="h-8 w-24 rounded-full shrink-0" />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-14 py-10">
        {/* ── Popular Stories ── */}
        <section>
          <S className="h-6 w-40 mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden"
              >
                <S className="w-full h-44 rounded-none" />
                <div className="p-4 space-y-2">
                  <S className="h-3 w-20" />
                  <S className="h-5 w-full" />
                  <S className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Join Banner ── */}
        <S className="h-40 w-full rounded-2xl" />

        {/* ── Recent Comments ── */}
        <section>
          <S className="h-6 w-40 mb-5" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <S className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-2">
                  <div className="flex gap-3">
                    <S className="h-3 w-24" />
                    <S className="h-3 w-16" />
                  </div>
                  <S className="h-3 w-full" />
                  <S className="h-3 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Last Words Feed ── */}
        <section>
          <S className="h-6 w-32 mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <S className="h-8 w-8 rounded-full shrink-0" />
                  <S className="h-3 w-24" />
                </div>
                <S className="h-3 w-full" />
                <S className="h-3 w-5/6" />
                <S className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-800 bg-gray-950 px-6 py-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <S className="h-4 w-24" />
              <S className="h-3 w-20" />
              <S className="h-3 w-16" />
              <S className="h-3 w-20" />
              <S className="h-3 w-14" />
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-800 flex justify-between">
          <S className="h-3 w-48" />
          <S className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}
