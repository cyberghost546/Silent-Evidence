// app/admin/funnel/page.tsx
// Conversion funnel — where readers drop off on the way to subscribing.
//
// Read this as gaps, not totals. The interesting number is always the "of
// previous" column: it says which single step is losing you the most people, and
// therefore which one is worth fixing next.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getFunnelSummary } from '@/lib/funnel';

export const metadata = { title: 'Conversion Funnel — Admin' };

type Props = { searchParams: Promise<{ days?: string }> };

const RANGES = [7, 30, 90];

export default async function AdminFunnelPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== 'ADMIN') redirect('/');

  const { days: rawDays } = await searchParams;
  const days = RANGES.includes(Number(rawDays)) ? Number(rawDays) : 30;

  const { since, stages } = await getFunnelSummary(days);
  const top = stages[0]?.users ?? 0;

  // Largest single drop between consecutive stages — the bottleneck worth
  // fixing first. Computed from ofPrevious so it reflects proportional loss
  // rather than raw headcount.
  let worst: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < stages.length; i++) {
    const pct = stages[i].ofPrevious;
    if (pct === null) continue;
    const lost = 100 - pct;
    if (!worst || lost > worst.lost) {
      worst = { from: stages[i - 1].label, to: stages[i].label, lost };
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-1 h-6 bg-red-600 rounded-full" />
          <h1 className="text-2xl font-bold">Conversion Funnel</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Distinct readers per stage since{' '}
          {since.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
        </p>

        {/* Range picker */}
        <div className="flex gap-2 mb-8">
          {RANGES.map((r) => (
            <a
              key={r}
              href={`/admin/funnel?days=${r}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                r === days
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {r} days
            </a>
          ))}
        </div>

        {top === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center">
            <p className="text-sm text-gray-400 mb-2">No funnel data yet.</p>
            <p className="text-xs text-gray-600">
              Events start recording as soon as a logged-in non-subscriber opens
              the pricing page. Nothing is backfilled — this only covers activity
              from now on.
            </p>
          </div>
        ) : (
          <>
            {/* ── Stage bars ─────────────────────────────────────────────── */}
            <div className="space-y-3 mb-8">
              {stages.map((s, i) => {
                const width = top > 0 ? Math.max((s.users / top) * 100, 1.5) : 0;
                const isDrop = s.ofPrevious !== null && s.ofPrevious < 50;
                return (
                  <div key={s.stage} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <div className="flex items-baseline justify-between gap-4 mb-2">
                      <p className="text-sm font-semibold">
                        <span className="text-gray-600 mr-2">{i + 1}.</span>
                        {s.label}
                      </p>
                      <div className="flex items-baseline gap-3 shrink-0">
                        <span className="text-lg font-bold">{s.users.toLocaleString()}</span>
                        {s.ofPrevious !== null && (
                          <span className={`text-xs font-semibold ${isDrop ? 'text-red-400' : 'text-emerald-400'}`}>
                            {s.ofPrevious}% of previous
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>

                    {s.ofTop !== null && i > 0 && (
                      <p className="text-xs text-gray-600 mt-2">
                        {s.ofTop}% of everyone who viewed pricing
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── The one thing to fix ───────────────────────────────────── */}
            {worst && worst.lost > 0 && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
                <p className="text-xs uppercase tracking-widest text-amber-400/70 mb-1">
                  Biggest drop-off
                </p>
                <p className="text-sm text-white">
                  <span className="font-bold">{Math.round(worst.lost)}%</span> of readers
                  are lost between &ldquo;{worst.from}&rdquo; and &ldquo;{worst.to}&rdquo;.
                </p>
                <p className="text-xs text-gray-500 mt-1.5">
                  This is the step worth fixing before adding anything new.
                </p>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-gray-700 mt-8">
          Counts are distinct users, not events — someone who opens the pricing
          page five times in a day counts once. Logged-in readers only: guests
          cannot subscribe, so they are not part of this funnel.
        </p>
      </div>
    </main>
  );
}
