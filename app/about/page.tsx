// app/about/page.tsx
// The "About" marketing page for Silent Evidence.
// This is a Next.js Server Component — it runs entirely on the server at
// request time, so it can query the database directly (no API route needed)
// and the browser receives plain HTML. No client-side JavaScript is shipped
// for this page.

import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Metadata exported from a Server Component is picked up by Next.js and
// injected into the <head> of the page (sets the browser tab title and
// any other meta tags you add here).
export const metadata = { title: 'About — Silent Evidence' };

// The component is declared `async` so we can use `await` inside it.
// Next.js renders this on the server for every request (no static caching)
// so the numbers are always fresh from the database.
export default async function AboutPage() {
  // Promise.all fires all three Prisma queries at the same time instead of
  // waiting for each one to finish before starting the next. This cuts the
  // total wait time down to roughly the slowest single query rather than the
  // sum of all three.
  const [storyCount, userCount, commentCount] = await Promise.all([
    prisma.story.count({ where: { status: 'PUBLISHED' } }), // only count live stories
    prisma.user.count(),    // all registered users
    prisma.comment.count(), // all comments across all stories
  ]);

  // Everything below is JSX — the server renders this to HTML and sends it
  // to the browser. Tailwind utility classes handle all styling.
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Shared site navigation rendered at the top of every page */}
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────
          Full-width banner at the top of the page with a tagline.
          `relative overflow-hidden` lets the absolute-positioned radial
          gradient sit behind the text without overflowing the section. */}
      <section className="relative overflow-hidden bg-gray-900 border-b border-gray-800">
        {/* Decorative purple radial glow — purely visual, pointer events
            are irrelevant so it sits in the background with `absolute inset-0` */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.15)_0%,_transparent_70%)]" />
        {/* `relative` here lifts the text above the absolutely-positioned glow */}
        <div className="max-w-4xl mx-auto px-4 py-20 text-center relative">
          <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Our Story</p>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Where every horror fan<br />finds their voice.
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Silent Evidence is a community built for people who believe the best stories live in the
            dark. We are a home for horror writers, paranormal enthusiasts,
            and anyone who lives and breathes fear.
          </p>
        </div>
      </section>

      {/* ── Live Stats ────────────────────────────────────────────────────
          Displays the three counts fetched from the database above.
          The array is mapped into a 3-column grid so adding or reordering
          stats only requires changing the array, not the JSX structure. */}
      <section className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-3 gap-6 text-center">
          {[
            { value: storyCount,   label: 'Stories Published' },
            { value: userCount,    label: 'Community Members' },
            { value: commentCount, label: 'Comments' },
          ].map(({ value, label }) => (
            // `key` must be unique — `label` works here because each entry
            // has a distinct label string.
            <div key={label}>
              {/* toLocaleString() formats large numbers with commas (e.g. 1,234)
                  using the browser/server locale automatically */}
              <p className="text-4xl font-bold text-green-500">{value.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────────
          Two-column layout on medium+ screens: text on the left,
          a decorative card stack on the right.
          On mobile the grid collapses to a single column and the card
          stack is hidden (`hidden md:block`) to keep the layout clean. */}
      <section className="max-w-4xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3">What We Believe</p>
          <h2 className="text-3xl font-bold text-white mb-5">Every character has a story.</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            We started Silent Evidence because we believed that the horror community deserved a
            dedicated space — somewhere away from the noise, where a well-crafted scary story could
            be appreciated on its own terms.
          </p>
          <p className="text-gray-400 leading-relaxed mb-4">
            Whether you write ghost stories, psychological horror, true crime, or cosmic dread,
            this platform was built for you. We celebrate the full spectrum of
            dark fiction and paranormal storytelling.
          </p>
          <p className="text-gray-400 leading-relaxed">
            Our readers are just as important as our writers. Every like, comment, and reply
            helps stories find the audience they deserve.
          </p>
        </div>

        {/* Decorative card stack — three overlapping <div>s each rotated
            slightly to create a fanned/stacked book effect.
            `absolute` positioning within the `relative` parent lets each
            card be placed independently with `top` / `right` offsets. */}
        <div className="relative h-72 hidden md:block">
          {/* Back card — most rotated (rotate-6), creates the deepest layer */}
          <div className="absolute top-0 right-8 w-52 h-64 bg-gray-800 border border-gray-700 rounded-2xl rotate-6" />
          {/* Middle card — slight rotation (rotate-2), sits between back and front */}
          <div className="absolute top-4 right-4 w-52 h-64 bg-gray-800 border border-gray-700 rounded-2xl rotate-2" />
          {/* Front card — no rotation, contains the pull-quote */}
          <div className="absolute top-8 right-0 w-52 h-64 bg-gray-900 border border-red-900/50 rounded-2xl flex flex-col justify-end p-5">
            {/* Small red accent bar above the quote text */}
            <div className="w-8 h-1 bg-red-600 rounded mb-3" />
            <p className="text-sm font-semibold text-white leading-snug">The darkness between stars is where we live.</p>
            <p className="text-xs text-gray-600 mt-2">— Silent Evidence</p>
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────────────
          Three value cards rendered from an array, each with an inline SVG
          icon, a title, and a short description.
          Using an array + .map() keeps the markup DRY — all three cards
          share the same wrapper styles, only the content differs. */}
      <section className="bg-gray-900 border-y border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-3 text-center">What Drives Us</p>
          <h2 className="text-3xl font-bold text-white mb-10 text-center">Our values</h2>
          {/* sm:grid-cols-3 — single column on mobile, three columns on ≥640 px */}
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                // SVG icon: open book — represents storytelling
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                title: 'Storytelling First',
                body: 'We put the craft of writing above everything. Good stories deserve to be read — regardless of follower counts or algorithms.',
              },
              {
                // SVG icon: group of people — represents community
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0" />
                  </svg>
                ),
                title: 'Community',
                body: 'Horror is better shared. We foster genuine connections between readers and writers through comments, replies, and discussion.',
              },
              {
                // SVG icon: shield with check — represents safety
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Safe Space',
                body: 'Horror fiction explores dark themes — but our community treats every member with respect. Hate and harassment have no place here.',
              },
            ].map(({ icon, title, body }) => (
              // Each card: semi-transparent dark background with a subtle border
              <div key={title} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
                {/* Icon sits inside a small rounded container with a tinted green border */}
                <div className="w-10 h-10 bg-green-600/10 border border-green-600/20 rounded-xl flex items-center justify-center text-white mb-4">
                  {icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to Action ────────────────────────────────────────────────
          Bottom section nudging visitors to sign up or start writing.
          Two <Link> buttons side-by-side (flex-wrap allows them to stack
          on very narrow screens). */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to share your story?</h2>
        <p className="text-gray-500 mb-8">Join thousands of writers and readers who call Silent Evidence home.</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Primary CTA — takes the visitor to the registration page */}
          <Link href="/register" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition">
            Create an account
          </Link>
          {/* Secondary CTA — takes existing users straight to the editor */}
          <Link href="/write" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition border border-gray-700">
            Write a story
          </Link>
        </div>
      </section>

      {/* Shared site footer rendered at the bottom of every page */}
      <Footer />
    </main>
  );
}
