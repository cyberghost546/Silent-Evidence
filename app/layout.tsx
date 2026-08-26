// app/layout.tsx
// Root layout — wraps every page on the site.
// Registers the service worker so the site works as a PWA (installable phone app).

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ServiceWorkerRegistration — client component that registers the SW on load
import ServiceWorkerRegistration from "./components/ui/ServiceWorkerRegistration";
import AnnouncementBanner from "./components/ui/AnnouncementBanner";
import ErrorBoundary from "./components/ui/ErrorBoundary";
// PWA install prompt — shows "Add to Home Screen" banner when the app is installable
import PWAInstallPrompt from "./components/ui/PWAInstallPrompt";
import ChatBot from "./components/ui/ChatBot";
import TutorialGuide from "./components/ui/TutorialGuide";
import CookieBanner from "./components/ui/CookieBanner";
import ScrollToTop from "./components/ui/ScrollToTop";

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
// Validates required env vars at startup — throws a clear error if any are missing
import { validateEnv } from "@/lib/env";

// Run validation once when the server starts up
validateEnv();

// Cache the announcement banner for 60 seconds — avoids a DB hit on every page load.
// The cache is invalidated automatically when the admin updates the banner via the API.
const getAnnouncement = unstable_cache(
  async () => {
    const row = await prisma.siteSetting
      .findUnique({ where: { key: 'announcement' } })
      .catch(() => null);
    return row?.value ?? '';
  },
  ['announcement-banner'],
  { revalidate: 60, tags: ['announcement-banner'] }
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Silent Evidence",
  description: "A community for horror story readers and writers. Explore the darkness.",
  // PWA meta tags — tell iOS/Android this is an installable app
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Silent Evidence",
  },
  // Prevents phone from treating phone numbers as links
  formatDetection: { telephone: false },
};

// Viewport config — viewport-fit=cover is set via the <meta> tag above so the
// notch/Dynamic Island safe-area CSS works. themeColor here colors Android's status bar.
export const viewport = {
  themeColor: "#111827",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch the current announcement message — cached for 60 s to avoid per-request DB hits
  const announcement = await getAnnouncement();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        {/* iOS — makes it behave like a native app when added to home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Silent Evidence" />
        {/* Apple touch icon — icon shown on iOS home screen (must point to a real file) */}
        <link rel="apple-touch-icon" href="/icons/web-app-manifest-192x192.png" />
        {/* Windows tile */}
        <meta name="msapplication-TileColor" content="#dc2626" />
        <meta name="msapplication-TileImage" content="/icons/web-app-manifest-192x192.png" />
        {/* Viewport-fit=cover lets content extend under the iPhone notch/Dynamic Island.
            The actual padding is applied via env(safe-area-inset-*) in globals.css */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      {/* overflow-x-hidden prevents any content from causing a horizontal scrollbar */}
      <body className="min-h-full flex flex-col bg-gray-900 overflow-x-hidden w-full" suppressHydrationWarning>
        {/* Skip link — WCAG 2.4.1 "Bypass Blocks" (Level A), and part of what the
            European Accessibility Act requires of consumer services. Every page
            here starts with the same header, nav and category bar, so without
            this a keyboard or screen-reader user has to tab through all of it
            again on every single navigation before reaching the content.

            It is visually hidden until focused (sr-only + focus:not-sr-only),
            which is the standard pattern: invisible to sighted mouse users,
            the first thing a keyboard user reaches. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-red-600 focus:text-white focus:font-semibold focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        {/* Registers the service worker — enables offline support and installability */}
        <ServiceWorkerRegistration />
        {/* Site-wide announcement banner — admin-controlled, dismissable per session */}
        <AnnouncementBanner message={announcement} />
        {/* ErrorBoundary catches any JS errors in child components and shows a fallback
            instead of a blank page — critical for keeping the site usable on partial errors */}
        <ErrorBoundary>
          {/* tabIndex={-1} lets the skip link move focus here programmatically;
              without it the browser scrolls but focus stays in the header. */}
          <div id="main-content" tabIndex={-1} className="flex-1">{children}</div>
        </ErrorBoundary>
        {/* PWA install prompt — floating banner asking users to add the app to their home screen */}
        <PWAInstallPrompt />
        {/* AI chatbot — floating widget available on every page */}
        <ChatBot />
        {/* Step-by-step tutorial guide — auto-opens for first-time visitors */}
        <TutorialGuide />
        {/* GDPR cookie consent banner — shown once to new visitors */}
        <CookieBanner />
        {/* Scroll-to-top button — appears after scrolling 400 px */}
        <ScrollToTop />
      </body>
    </html>
  );
}
