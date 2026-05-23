// app/components/ui/Header.tsx
// Site-wide sticky header — rendered at the top of every page.
// This is an async server component; it reads the session cookie to decide
// whether to show the logged-in nav (avatar, notifications, DMs) or the
// guest nav (Log In / Sign Up). Forums are fetched from the DB to populate
// the ForumsDropdown. To add a top-nav link, add it to the <ul> below.

import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import CategoryDropdown from './CategoryDropdown';
import ExploreDropdown from './ExploreDropdown';
import ForumsDropdown from './ForumsDropdown';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import DMIcon from './DMIcon';
import ThemeToggle from './ThemeToggle';
import MobileNav from './MobileNav';

export default async function Header() {
  // Read the session cookie to get the current user's DB id (0 = guest)
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Fetch forums in display order for the ForumsDropdown menu
  const forums = await prisma.forum.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true, slug: true, icon: true, description: true },
  });

  // Only hit the DB for user data when someone is actually logged in
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          role: true,
          profile: { select: { avatar: true } },
        },
      })
    : null;

  // Fall back to a generated initial-avatar when the user hasn't uploaded a photo
  const avatar = user
    ? (user.profile?.avatar ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=dc2626&color=fff&size=64`)
    : null;

  return (
    // sticky top-0 keeps the header pinned while the user scrolls
    <header className="sticky top-0 z-50 bg-gray-900 text-white px-4 md:px-6 py-3 border-b border-gray-800">
      <nav className="max-w-6xl mx-auto flex items-center gap-3 md:gap-6">

        {/* Logo — links to homepage */}
        <Link href="/" className="text-lg md:text-xl font-bold text-red-500 hover:text-red-400 transition">
          Silent Evidence
        </Link>

        {/* Desktop nav links — hidden on mobile (MobileNav handles those) */}
        <ul className="hidden md:flex items-center gap-4 text-sm">
          <li>
            <Link href="/" className="hover:text-gray-300">Home</Link>
          </li>
          <li>
            {/* Dropdown listing all story categories from the DB */}
            <CategoryDropdown />
          </li>
          <li>
            {/* Dropdown listing all forums fetched above */}
            <ForumsDropdown forums={forums} />
          </li>
          <li>
            {/* Videos gets a red pill to make it stand out */}
            <Link href="/videos" className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700">
              Videos
            </Link>
          </li>
          <li>
            <ExploreDropdown />
          </li>
          <li>
            <Link href="/about" className="hover:text-gray-300">About</Link>
          </li>

          <li>
            <Link href="/contact" className="hover:text-gray-300">Contact</Link>
          </li>
        </ul>

        {/* Spacer — pushes search + user controls to the right */}
        <div className="flex-1" />

        <SearchBar />

        {/* Logged-in state: show theme toggle, DMs, notifications, and avatar menu */}
        {user && avatar ? (
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <DMIcon />
            <NotificationBell />
            <UserMenu username={user.username} avatar={avatar} role={user.role} />
          </div>
        ) : (
          /* Guest state: show Log In and Sign Up buttons */
          <div className="flex items-center gap-1.5">
            <Link href="/login" className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-red-700 text-red-400 hover:bg-red-700 hover:text-white rounded-lg transition">
              Log In
            </Link>
            {/* Sign Up is hidden on very small screens — it appears inside MobileNav instead */}
            <Link href="/register" className="hidden sm:block px-3 py-1.5 text-sm bg-red-700 text-white hover:bg-red-600 rounded-lg transition">
              Sign Up
            </Link>
          </div>
        )}

        {/* Hamburger menu — shown on mobile, contains the full nav */}
        <MobileNav isLoggedIn={!!user} />

      </nav>
    </header>
  );
}
