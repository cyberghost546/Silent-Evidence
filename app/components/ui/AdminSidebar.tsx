'use client';
// ============================================================
// FILE: AdminSidebar.tsx
// PURPOSE: The persistent left-hand navigation sidebar for every admin page.
//          On desktop (md and up) it's always visible.
//          On mobile it's hidden by default and slides in from the left when
//          the hamburger button in the top bar is tapped.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Replace the `links` array with your own routes and icons.
//   - The active-link highlight uses usePathname() from Next.js — it returns
//     the current URL path so you can compare it against each link's href.
//   - The mobile slide-in pattern uses Tailwind's translate-x classes toggled
//     by a boolean state variable. No third-party library needed.
//   - The backdrop <div> that closes the drawer when clicked outside is a
//     simple pattern: render a full-screen div behind the sidebar and attach
//     an onClick that sets mobileOpen to false.
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// links — the full list of admin navigation items.
// Each object has:
//   href  — the URL this link points to
//   label — human-readable name shown in the sidebar
//   icon  — emoji icon displayed to the left of the label
const links = [
  { href: '/admin',              label: 'Overview',    icon: '📊' },
  { href: '/admin/users',        label: 'Users',       icon: '👥' },
  { href: '/admin/stories',      label: 'Stories',     icon: '📖' },
  { href: '/admin/generate',     label: 'AI Generator', icon: '🤖' },
  { href: '/admin/comments',     label: 'Moderation',  icon: '🚩' },
  { href: '/admin/reports',      label: 'Reports',     icon: '⚠️'  },
  { href: '/admin/login-logs',   label: 'Login Logs',  icon: '🔐' },
  { href: '/admin/analytics',    label: 'Analytics',   icon: '📈' },
  { href: '/admin/challenges',   label: 'Challenges',  icon: '⚔️'  },
  { href: '/admin/slides',       label: 'Slideshow',   icon: '🖼️'  },
  { href: '/admin/categories',   label: 'Categories',  icon: '🏷️' },
  { href: '/admin/announcement',   label: 'Announcement',   icon: '📢' },
  { href: '/admin/story-of-week', label: 'Story of Week',  icon: '🏆' },
  { href: '/admin/contact',       label: 'Contact Inbox',  icon: '✉️'  },
  { href: '/admin/newsletter',    label: 'Newsletter',      icon: '📰' },
  { href: '/admin/digest',        label: 'Comment Digest',  icon: '💬' },
  { href: '/admin/bundles',       label: 'Bundles',         icon: '📦' },
  { href: '/admin/prompts',         label: 'Writing Prompts',     icon: '✍️' },
  { href: '/admin/cookies',         label: 'Cookie Consent',      icon: '🍪' },
  // ── New pages ──
  { href: '/admin/verification',    label: 'Verification',         icon: '✅' },
  { href: '/admin/revenue',         label: 'Revenue',              icon: '💰' },
  { href: '/admin/banned-words',    label: 'Content Filter',       icon: '🚫' },
  { href: '/admin/warnings',        label: 'Warnings & Bans',      icon: '⛔' },
  { href: '/admin/search',          label: 'Admin Search',         icon: '🔎' },
  { href: '/admin/tags',            label: 'Tag Manager',          icon: '🏷️' },
  { href: '/admin/scheduled',       label: 'Scheduled Stories',    icon: '🕐' },
  { href: '/admin/email-log',       label: 'Email Log',            icon: '📧' },
  { href: '/admin/health',          label: 'Site Health',          icon: '❤️' },
  { href: '/admin/mood',            label: 'Mood of Day',          icon: '🌑' },
  { href: '/admin/featured-authors',label: 'Featured Authors',     icon: '⭐' },
  { href: '/admin/spotlight',       label: 'Story Spotlight',      icon: '🔦' },
  { href: '/admin/polls',           label: 'Poll Manager',         icon: '📊' },
  { href: '/admin/audit-log',       label: 'Audit Log',            icon: '📋' },
];

export default function AdminSidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Logo / branding */}
      <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Admin Panel</p>
          <Link href="/" className="text-lg font-bold text-red-500 hover:text-red-400 transition">
            Silent Evidence
          </Link>
        </div>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-gray-500 hover:text-white transition"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ href, label, icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition font-medium ${
                active
                  ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: logged-in user + back to site link */}
      <div className="px-4 py-4 border-t border-gray-800 space-y-3">
        <Link
          href="/"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold
                     bg-gray-800 border border-gray-700 text-gray-300
                     hover:bg-gray-700 hover:text-white transition"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Site
        </Link>
        <p className="text-xs text-gray-600 truncate px-1">
          Logged in as <span className="text-gray-400">{username}</span>
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-1 text-gray-400 hover:text-white transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-bold text-red-500">Admin Panel</span>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, slide-in on mobile */}
      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50
        transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {sidebarContent}
      </aside>
    </>
  );
}
