// app/wrapped/page.tsx
// "Your Year in Horror" — a premium-only personal reading recap.
//
// Server component: the premium check and every figure resolve on the server, so
// a free reader never receives their own stats in the page payload — the teaser
// below shows what the recap contains without computing any of it.
//
// The teaser is deliberate. A locked feature only sells if the reader can see
// the shape of what they are missing; hiding it entirely just makes the page
// look broken.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BookOpen,
  Flame,
  Heart,
  Bookmark,
  Clock,
  Skull,
  CalendarDays,
  Lock,
  Sparkles,
} from 'lucide-react';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { getPremiumContext } from '@/lib/premiumCheck';
import { getReadingWrapped } from '@/lib/readingWrapped';

export const metadata = {
  title: 'Your Year in Horror',
  description: 'A personal recap of everything you read, rated and survived this year.',
};

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default async function WrappedPage() {
  const { userId, hasPremium } = await getPremiumContext();

  if (!userId) redirect('/login?next=/wrapped');

  // ── Free-tier teaser ──────────────────────────────────────────────────────
  // Returns before getReadingWrapped runs, so none of the reader's data is
  // computed or transmitted.
  if (!hasPremium) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/30 mb-6">
            <Lock className="w-6 h-6 text-yellow-400" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Your Year in{' '}
            <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
              Horror
            </span>
          </h1>
          <p className="text-gray-400 mb-10">
            Every story you read, every scare you rated, every night you couldn&apos;t stop.
            We&apos;ve been keeping count — members can see the whole picture.
          </p>

          {/* Show the shape of the recap without any real numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 text-left">
            {[
              { icon: BookOpen, label: 'Stories read' },
              { icon: Clock, label: 'Hours in the dark' },
              { icon: Flame, label: 'Longest streak' },
              { icon: Skull, label: 'Your scariest read' },
              { icon: Sparkles, label: 'Your signature mood' },
              { icon: CalendarDays, label: 'Your darkest month' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-gray-800 bg-gray-900/60 p-4"
              >
                <item.icon
                  className="w-4 h-4 text-gray-600 mb-2"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <p className="text-xs text-gray-500">{item.label}</p>
                {/* Blurred placeholder stands in for the hidden figure */}
                <p
                  className="text-lg font-bold text-gray-700 blur-[5px] select-none"
                  aria-hidden="true"
                >
                  000
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/premium"
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition text-sm"
          >
            Unlock your recap
          </Link>
          <p className="text-xs text-gray-600 mt-4">
            We&apos;ve been recording since the day you joined — nothing is lost by waiting.
          </p>
        </div>
        <Footer />
      </main>
    );
  }

  const d = await getReadingWrapped(userId);

  // ── Nothing to summarise ──────────────────────────────────────────────────
  // A member with no reading this year gets an invitation, not a wall of zeroes.
  if (d.empty) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold mb-3">Your {d.year} is a blank page</h1>
          <p className="text-gray-400 mb-8">
            You haven&apos;t read anything yet this year. Open a story and this page starts filling
            itself in.
          </p>
          <Link
            href="/trending"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-sm"
          >
            Find something to read
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const peak = Math.max(1, ...d.byMonth);

  const HEADLINE = [
    {
      icon: BookOpen,
      label: 'Stories read',
      value: d.storiesRead.toLocaleString(),
      detail: d.finishRate !== null ? `${d.finishRate}% finished` : undefined,
    },
    {
      icon: Clock,
      label: 'Time in the dark',
      value:
        d.minutesRead >= 60
          ? `${Math.floor(d.minutesRead / 60)}h ${d.minutesRead % 60}m`
          : `${d.minutesRead}m`,
      detail: `${d.wordsRead.toLocaleString()} words`,
    },
    {
      icon: Flame,
      label: 'Longest streak',
      value: `${d.longestStreak}`,
      detail: d.longestStreak === 1 ? 'day' : 'days in a row',
    },
    { icon: Heart, label: 'Likes given', value: d.likesGiven.toLocaleString() },
    { icon: Bookmark, label: 'Bookmarked', value: d.bookmarksSaved.toLocaleString() },
    {
      icon: Skull,
      label: 'Average scare',
      value: d.averageScare !== null ? `${d.averageScare}/5` : '—',
      detail: d.averageScare === null ? 'rate a story to fill this in' : undefined,
    },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600 mb-3">
            {d.year} · Members only
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Your Year in{' '}
            <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
              Horror
            </span>
          </h1>
          {d.firstStory && (
            <p className="text-sm text-gray-500">
              It started on{' '}
              {new Date(d.firstStory.readAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })}{' '}
              with{' '}
              <Link
                href={`/story/${d.firstStory.slug}`}
                className="text-gray-300 hover:text-white underline underline-offset-2"
              >
                {d.firstStory.title}
              </Link>
            </p>
          )}
        </div>

        {/* ── Headline numbers ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {HEADLINE.map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <s.icon
                className="w-4 h-4 text-gray-600 mb-2"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <p className="text-2xl font-extrabold leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1.5">{s.label}</p>
              {s.detail && <p className="text-xs text-gray-700 mt-0.5">{s.detail}</p>}
            </div>
          ))}
        </div>

        {/* ── Signature cards ───────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-3 gap-3 mb-10">
          {d.topMood && (
            <div className={`rounded-2xl border p-5 ${d.topMood.color}`}>
              <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Your mood</p>
              <p className="text-2xl font-extrabold">{d.topMood.label}</p>
              <p className="text-xs opacity-70 mt-1">{d.topMood.count} stories</p>
            </div>
          )}

          {d.topCategory && (
            <Link
              href={`/category/${d.topCategory.slug}`}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition"
            >
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-1">Your genre</p>
              <p className="text-2xl font-extrabold leading-tight">{d.topCategory.name}</p>
              <p className="text-xs text-gray-600 mt-1">{d.topCategory.count} stories</p>
            </Link>
          )}

          {d.topAuthor && (
            <Link
              href={`/user/${d.topAuthor.username}`}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition"
            >
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-1">Your author</p>
              <p className="text-2xl font-extrabold leading-tight">@{d.topAuthor.username}</p>
              <p className="text-xs text-gray-600 mt-1">{d.topAuthor.count} stories</p>
            </Link>
          )}
        </div>

        {/* ── Scariest read ─────────────────────────────────────────────────── */}
        {d.scariest && (
          <Link
            href={`/story/${d.scariest.slug}`}
            className="block rounded-2xl border border-red-500/25 bg-red-500/5 p-5 mb-10 hover:border-red-500/50 transition"
          >
            <p className="text-xs uppercase tracking-widest text-red-400/70 mb-1">
              The one that got you
            </p>
            <p className="text-xl font-bold">{d.scariest.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              You rated it {d.scariest.rating}/5 — your highest of the year
            </p>
          </Link>
        )}

        {/* ── Month-by-month ────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h2 className="text-sm font-semibold">Month by month</h2>
            {d.peakMonth && (
              <p className="text-xs text-gray-500">
                Darkest month: <span className="text-gray-300">{d.peakMonth.name}</span>
              </p>
            )}
          </div>

          <div className="flex items-end gap-1.5 h-28">
            {d.byMonth.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full bg-red-600/60 hover:bg-red-500 rounded-sm transition-colors"
                  // Scaled to the reader's own busiest month. min-height keeps
                  // empty months as a visible baseline rather than nothing.
                  style={{ height: `${(count / peak) * 100}%`, minHeight: '2px' }}
                  title={`${count} ${count === 1 ? 'story' : 'stories'}`}
                />
                <span className="text-[10px] text-gray-600 select-none">{MONTH_INITIALS[i]}</span>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-gray-700 mt-8">
          Updated live as you read. Come back in December for the full picture.
        </p>
      </div>

      <Footer />
    </main>
  );
}
