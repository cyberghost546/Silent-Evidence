// app/components/ui/Header.tsx
// The site-wide top navigation bar — rendered on every page.
// This is an async server component, meaning it can fetch data directly from the
// database without needing an API route or useEffect.
// It reads the userId cookie to determine whether a user is logged in,
// then passes the user data down to smaller client components (UserMenu, NotificationBell, etc.).

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
  // Read the session cookie set at login — gives us the logged-in user's database ID
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Fetch forums for the ForumsDropdown — ordered by the 'order' field set in admin
  const forums = await prisma.forum.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true, slug: true, icon: true, description: true },
  });

  // Only query the database for user data if a valid userId cookie exists.
  // If userId is 0 (no cookie), skip the query and treat them as a guest.
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          role: true,
          profile: { select: { avatar: true } }, // Avatar image URL from their profile
        },
      })
    : null;

  // Determine which avatar URL to use.
  // If the user hasn't uploaded a custom avatar, fall back to ui-avatars.com
  // which auto-generates an avatar from their username initials.
  const avatar = user
    ? (user.profile?.avatar ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=dc2626&color=fff&size=64`)
    : null;

  return (
    // sticky top-0 keeps the header pinned while scrolling, z-50 keeps it above all content
    <header className="sticky top-0 z-50 bg-gray-900 text-white px-4 md:px-6 py-3 border-b border-gray-800">
      <nav className="max-w-6xl mx-auto flex items-center gap-3 md:gap-6">

        {/* Logo — red accent for the horror theme.
            The skull emoji adds instant genre identity without needing an image asset. */}
        <Link href="/" className="text-lg md:text-xl font-bold text-red-500 hover:text-red-400 transition shrink-0 tracking-wide">
           Silent Evidence
        </Link>

        {/* Desktop nav links — hidden on mobile (md:flex shows them on medium screens and up) */}
        <ul className="hidden md:flex items-center gap-4 text-sm flex-shrink-0">
          <li><Link href="/" className="hover:text-gray-300 transition">Home</Link></li>
          {/* CategoryDropdown fetches its own category list internally */}
          <li><CategoryDropdown /></li>
          {/* ForumsDropdown receives forum data fetched above so it doesn't need its own DB call */}
          <li><ForumsDropdown forums={forums} /></li>
          <li>
            {/* Videos link styled as a red pill button to stand out */}
            <Link href="/videos" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition">
               Videos
            </Link>
          </li>
          {/* ExploreDropdown contains links to features like the Horror Map, Challenges, etc. */}
          <li><ExploreDropdown /></li>
          <li><Link href="/about" className="hover:text-gray-300 transition">About</Link></li>
        </ul>

        {/* Spacer — flex-1 pushes everything after this to the right edge */}
        <div className="flex-1" />

        {/* Search bar — hidden on very small screens to save space */}
        <div className="hidden sm:block">
          <SearchBar />
        </div>

        {/* Auth section — shows different content depending on login state */}
        {user && avatar ? (
          // Logged-in: show theme toggle, DMs, notification bell, and user avatar menu
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <DMIcon />
            <NotificationBell />
            {/* UserMenu shows the avatar and a dropdown with profile/settings/logout links */}
            <UserMenu username={user.username} avatar={avatar} role={user.role} />
          </div>
        ) : (
          // Logged-out: show Log In and Sign Up buttons (hidden on mobile — MobileNav handles those)
          <div className="hidden sm:flex items-center gap-2 text-sm flex-shrink-0">
            {/* Log In — outlined red button */}
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg border border-red-700 text-red-400 hover:bg-red-700 hover:text-white transition text-xs md:text-sm"
            >
              Log In
            </Link>
            {/* Sign Up — solid red button */}
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-lg bg-red-700 text-white hover:bg-red-600 transition text-xs md:text-sm"
            >
              Sign Up
            </Link>
          </div>
        )}

        {/* Mobile hamburger — only visible on small screens, contains the full nav menu */}
        <MobileNav isLoggedIn={!!user} />

      </nav>
    </header>
  );
}
