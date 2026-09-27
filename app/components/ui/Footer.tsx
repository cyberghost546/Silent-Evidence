// app/components/ui/Footer.tsx
// Site-wide footer — rendered at the bottom of every page.
// This is an async server component; it fetches up to 8 categories directly
// from the database to populate the "Categories" column.
// To add or remove links, edit the arrays in the Navigate and Account sections below.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import CookieSettingsButton from './CookieSettingsButton';

export default async function Footer() {
  // Fetch the first 8 categories alphabetically for the footer's category column.
  // If you want more or fewer categories shown, change the `take` number.
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    take: 8,
    select: { name: true, slug: true },
  });

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Four-column grid — collapses to 2 columns on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Brand column — logo, tagline, and social links */}
          <div className="lg:col-span-1">
            <Link href="/" className="text-xl font-bold text-red-500 hover:text-red-400 transition">
              Silent Evidence
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              A community for horror story readers and writers. Share your story with the world.
            </p>
            {/* Social media icons */}
            <div className="flex items-center gap-4 mt-5">
              <a
                href="https://x.com/silentevidence"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="text-gray-600 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://reddit.com/r/silentevidence"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Reddit"
                className="text-gray-600 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
              </a>
              <a
                href="https://discord.gg/silentevidence"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
                className="text-gray-600 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.944 19.944 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.201 13.201 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation column — to add a link, add an object to this array */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
              Navigate
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Home', href: '/' },
                { label: 'Write a Story', href: '/write' },
                { label: 'Search', href: '/search' },
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-gray-500 hover:text-white transition">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories column — populated from the database (up to 8, alphabetical) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
              Categories
            </h3>
            <ul className="space-y-2.5 text-sm">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-gray-500 hover:text-white transition"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account + Legal column */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
              Account
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Log In', href: '/login' },
                { label: 'Sign Up', href: '/register' },
                { label: 'Settings', href: '/settings' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-gray-500 hover:text-white transition">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 mt-7">
              Legal
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Acceptable Use', href: '/acceptable-use' },
                // DMCA §512 requires the takedown contact to be reasonably
                // discoverable, and DSA Art. 16 the same for illegal-content
                // notices — a footer link on every page is the usual answer.
                { label: 'Copyright & Illegal Content', href: '/copyright' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-gray-500 hover:text-white transition">
                    {label}
                  </Link>
                </li>
              ))}
              {/* Persistent way to change or withdraw cookie consent — required
                  by GDPR Art. 7(3), which says withdrawing must be as easy as
                  giving. Reopens the banner rather than navigating. */}
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar — copyright and tagline.
            new Date().getFullYear() automatically updates the year each year. */}
        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>{new Date().getFullYear()} Silent Evidence. All rights reserved.</p>
          <p>Made with for horror fans everywhere.</p>
        </div>
      </div>
    </footer>
  );
}
