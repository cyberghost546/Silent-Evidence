// This file builds the top bar you see on every page

// This lets you click links without refreshing the page
import Link from 'next/link';

// This lets us read a small note (cookie) from the browser
import { cookies } from 'next/headers';

// This lets us talk to the database
import { prisma } from '@/lib/prisma';

// These are small pieces of UI we reuse
import CategoryDropdown from './CategoryDropdown';
import ExploreDropdown from './ExploreDropdown';
import ForumsDropdown from './ForumsDropdown';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import DMIcon from './DMIcon';
import ThemeToggle from './ThemeToggle';
import MobileNav from './MobileNav';


// This builds the header
// async means we can get data before showing the page
export default async function Header() {

  // Get the cookie from the browser
  const cookieStore = await cookies();

  // Try to read userId from the cookie
  // If nothing is there, use 0 (means not logged in)
  const userId = Number(cookieStore.get('userId')?.value ?? 0);



  // Get all forums from the database
  const forums = await prisma.forum.findMany({
    orderBy: { order: 'asc' }, // sort them nicely
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      description: true
    },
  });



  // Check if user is logged in
  // If yes → get their data
  // If no → user = null
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          role: true,
          profile: {
            select: { avatar: true } // get their profile picture
          },
        },
      })
    : null;



  // Decide which profile picture to show
  const avatar = user
    ? (
        // If user uploaded a picture → use it
        user.profile?.avatar

        // If not → make a fake one using their name
        ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=dc2626&color=fff&size=64`
      )
    : null;



  return (

    // Main header box
    // sticky = stays at the top when you scroll
    <header className="sticky top-0 z-50 bg-gray-900 text-white px-4 md:px-6 py-3 border-b border-gray-800">

      {/* This holds everything inside the header */}
      <nav className="max-w-6xl mx-auto flex items-center gap-3 md:gap-6">



        {/* LOGO (click → go to home page) */}
        <Link
          href="/"
          className="text-lg md:text-xl font-bold text-red-500 hover:text-red-400 transition"
        >
          Silent Evidence
        </Link>



        {/* MENU (only shows on bigger screens) */}
        <ul className="hidden md:flex items-center gap-4 text-sm">

          {/* Go to home */}
          <li>
            <Link href="/" className="hover:text-gray-300">
              Home
            </Link>
          </li>

          {/* Open category menu */}
          <li>
            <CategoryDropdown />
          </li>

          {/* Open forums menu */}
          <li>
            <ForumsDropdown forums={forums} />
          </li>

          {/* Special button for videos */}
          <li>
            <Link
              href="/videos"
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            >
              Videos
            </Link>
          </li>

          {/* Explore more stuff */}
          <li>
            <ExploreDropdown />
          </li>

          {/* About page */}
          <li>
            <Link href="/about" className="hover:text-gray-300">
              About
            </Link>
          </li>


        </ul>



        {/* This pushes everything else to the right */}
        <div className="flex-1" />



        {/* SEARCH BAR (hidden on very small screens) */}
        <div className="hidden sm:block">
          <SearchBar />
        </div>



        {/* LOGIN PART */}
        {user && avatar ? (

          // If user is logged in
          <div className="flex items-center gap-2 md:gap-3">

            {/* Switch dark/light mode */}
            <ThemeToggle />

            {/* Messages */}
            <DMIcon />

            {/* Notifications */}
            <NotificationBell />

            {/* Profile menu (avatar + dropdown) */}
            <UserMenu
              username={user.username}
              avatar={avatar}
              role={user.role}
            />

          </div>

        ) : (

          // If user is NOT logged in
          <div className="hidden sm:flex items-center gap-2 text-sm">

            {/* Login button */}
            <Link
              href="/login"
              className="px-3 py-1.5 border border-red-700 text-red-400 hover:bg-red-700 hover:text-white rounded-lg"
            >
              Log In
            </Link>

            {/* Register button */}
            <Link
              href="/register"
              className="px-3 py-1.5 bg-red-700 text-white hover:bg-red-600 rounded-lg"
            >
              Sign Up
            </Link>

          </div>
        )}



        {/* Mobile menu (hamburger button on small screens) */}
        <MobileNav isLoggedIn={!!user} />



      </nav>
    </header>
  );
}