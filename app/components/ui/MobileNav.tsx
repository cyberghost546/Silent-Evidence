'use client';
// MobileNav.tsx
// Hamburger menu for screens narrower than the md breakpoint (hidden on desktop).
// Contains the full site navigation: all top-level links, an expandable
// Categories accordion, and login/sign-up buttons for guests.
//
// Props:
//   isLoggedIn — whether the current user is authenticated.
//                Used to conditionally show/hide the auth buttons.

import { useState } from 'react';
import Link from 'next/link';

// Top-level navigation links shown in the mobile menu (Home is rendered separately
// because it sits above the Categories accordion)
const navLinks = [
  { href: '/',           label: 'Home' },
  { href: '/forums',     label: 'Forums' },
  { href: '/challenges', label: 'Challenges' },
  { href: '/map',        label: 'Anime Map' },
  { href: '/quiz',       label: 'Quiz' },
  { href: '/about',      label: 'About' },
];

// Real-life horror categories — things people actually experienced and talk about
const categories = [
  'True Crime', 'Unexplained Disappearances', 'Haunted Locations', 'Near Death Experiences',
  'Unsolved Mysteries', 'Real Paranormal', 'Camping Horror', 'Stalker Stories',
  'Home Invasion', 'Strange Encounters', 'Cursed Places', 'Serial Killers',
  'Sleep Paralysis', 'Abandoned Places', 'Cults & Rituals', 'Witness Accounts',
  'Roadside Horror', 'Child Disappearances', 'Cryptids & Sightings', 'Online Horror',
];

export default function MobileNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  // Controls whether the full dropdown menu is visible
  const [open, setOpen] = useState(false);

  // Controls whether the Categories accordion is expanded inside the menu
  const [catsOpen, setCatsOpen] = useState(false);

  return (
    // Only visible on mobile — md: and above handled by the desktop nav
    <div className="md:hidden">
      {/* Hamburger / close button — toggles the menu open state */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
        className="p-2 text-gray-400 hover:text-white transition"
      >
        {open ? (
          // X icon when menu is open
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Hamburger icon when menu is closed
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Full-width dropdown panel — renders below the header bar */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-800 z-50 shadow-xl max-h-[80vh] overflow-y-auto">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">

            {/* Home link — always visible at top */}
            <Link href="/" onClick={() => setOpen(false)}
              className="py-2.5 px-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition">
              Home
            </Link>

            {/* Categories accordion — click to expand/collapse the full category list */}
            <div>
              <button
                onClick={() => setCatsOpen(o => !o)}
                className="w-full flex items-center justify-between py-2.5 px-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                Categories
                {/* Chevron rotates 180° when open */}
                <svg className={`w-4 h-4 transition-transform ${catsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Category list — indented under the accordion header */}
              {catsOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-gray-800 pl-3">
                  {categories.map(cat => {
                    // Convert display name to URL slug (e.g. "True stories" → "true-stories")
                    const slug = cat.toLowerCase().replace(/ /g, '-');
                    return (
                      <Link key={slug} href={`/category/${slug}`}
                        onClick={() => setOpen(false)}
                        className="py-2 px-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                        {cat}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Remaining top-level links (Forums, Challenges, Map, Quiz, About) */}
            {navLinks.slice(1).map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className="py-2.5 px-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition">
                {label}
              </Link>
            ))}

            {/* Auth buttons — only shown to guests (not logged-in users) */}
            {!isLoggedIn && (
              <div className="mt-2 pt-2 border-t border-gray-800 flex flex-col gap-1">
                <Link href="/login" onClick={() => setOpen(false)}
                  className="py-2.5 px-3 text-sm text-red-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                  Log In
                </Link>
                <Link href="/register" onClick={() => setOpen(false)}
                  className="py-2.5 px-3 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition text-center">
                  Sign Up
                </Link>
              </div>
            )}

          </nav>
        </div>
      )}
    </div>
  );
}
