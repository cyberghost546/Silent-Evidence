// app/about/page.tsx
// The "About" marketing page for Silent Evidence.
// This is a server component — it fetches live site statistics (story count,
// member count, comment count) directly from the database at request time so
// the numbers shown are always current without any client-side JavaScript.

import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'About — Silent Evidence' };

export default async function AboutPage() {
  // Fetch three counts in parallel using Promise.all — faster than awaiting each one separately
  const [storyCount, userCount, commentCount] = await Promise.all([
    prisma.story.count({ where: { status: 'PUBLISHED' } }), // only count live stories
    prisma.user.count(),    // all registered members
    prisma.comment.count(), // all comments across all stories
  ]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 border-b border-gray-800">
        {/* Radial blood-red glow behind the hero text */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.15)_0%,_transparent_70%)]" />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center relative">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-4">Our Story</p>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Where real horror<br />finds its voice.
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Silent Evidence is a community built for people who believe the most terrifying stories
            are the ones that actually happened. We are a home for survivors, witnesses, investigators,
            and anyone who has experienced something they cannot explain.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-3 gap-6 text-center">
          {[
            { value: storyCount,   label: 'Stories Shared' },
            { value: userCount,    label: 'Community Members' },
            { value: commentCount, label: 'Comments' },
          ].map(({ value, label }) => (
            <div key={label}>
              {/* Red accent number */}
              <p className="text-4xl font-bold text-red-500">{value.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">What We Believe</p>
          <h2 className="text-3xl font-bold text-white mb-5">Every shadow has a story.</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            We started Silent Evidence because the internet is full of places to read fictional horror —
            but very few places where real experiences are taken seriously. The things people whisper
            around campfires, the cases that never got solved, the nights nobody talks about in daylight.
          </p>
          <p className="text-gray-400 leading-relaxed mb-4">
            Whether you survived something, witnessed something, or have been investigating for years —
            this platform was built for you. True crime, unexplained disappearances, haunted locations,
            paranormal encounters. Real stories from real people.
          </p>
          <p className="text-gray-400 leading-relaxed">
            Our readers are just as important as our writers. Every comment, reply, and reaction
            helps survivors feel heard and keeps these stories from being forgotten.
          </p>
        </div>

        {/* Decorative stacked card effect — three overlapping cards fanned out.
            Hidden on mobile to keep the layout clean. */}
        <div className="relative h-72 hidden md:block">
          {/* Back card — most rotated, creates depth */}
          <div className="absolute top-0 right-8 w-52 h-64 bg-gray-800 border border-gray-700 rounded-2xl rotate-6" />
          {/* Middle card */}
          <div className="absolute top-4 right-4 w-52 h-64 bg-gray-800 border border-gray-700 rounded-2xl rotate-2" />
          {/* Front card — upright, contains the quote */}
          <div className="absolute top-8 right-0 w-52 h-64 bg-gray-900 border border-red-900/50 rounded-2xl flex flex-col justify-end p-5">
            <div className="w-8 h-1 bg-red-600 rounded mb-3" />
            <p className="text-sm font-semibold text-white leading-snug">"The darkness between stars is where we live."</p>
            <p className="text-xs text-gray-600 mt-2">— Silent Evidence</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-900 border-y border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3 text-center">What Drives Us</p>
          <h2 className="text-3xl font-bold text-white mb-10 text-center">Our values</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                title: 'Truth First',
                body: 'We put real experiences above everything. Genuine stories deserve to be heard — regardless of how unbelievable they sound.',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0" />
                  </svg>
                ),
                title: 'Community',
                body: 'Horror is better shared. We bring together survivors, investigators, and believers through comments, discussions, and shared experiences.',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Safe Space',
                body: 'Sharing a frightening experience takes courage. Our community treats every member and every story with respect. Harassment has no place here.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
                {/* Red accent icon container */}
                <div className="w-10 h-10 bg-red-600/10 border border-red-600/20 rounded-xl flex items-center justify-center text-red-500 mb-4">
                  {icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to share your story?</h2>
        <p className="text-gray-500 mb-8">Join thousands of writers and readers who call Silent Evidence home.</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition">
            Create an account
          </Link>
          <Link href="/write" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition border border-gray-700">
            Share your story
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
