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

// Viewport config — tells the browser to match the device's screen width
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Theme color — colors the browser chrome on Android
  // Deep red accent matches the horror theme
  themeColor: "#dc2626",
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
      // Default to dark — ThemeToggle reads localStorage on mount and switches if needed
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        {/* iOS specific — makes it look like a native app when added to home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Silent Evidence" />
        {/* Apple touch icon — the icon shown on iOS home screen */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* Splash screen background color on iOS — deep red for horror theme */}
        <meta name="msapplication-TileColor" content="#dc2626" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      {/* overflow-x-hidden prevents any content from causing a horizontal scrollbar */}
      <body className="min-h-full flex flex-col bg-gray-900 overflow-x-hidden w-full" suppressHydrationWarning>
        {/* Registers the service worker — enables offline support and installability */}
        <ServiceWorkerRegistration />
        {/* Site-wide announcement banner — admin-controlled, dismissable per session */}
        <AnnouncementBanner message={announcement} />
        {/* ErrorBoundary catches any JS errors in child components and shows a fallback
            instead of a blank page — critical for keeping the site usable on partial errors */}
        <ErrorBoundary>
          <div className="flex-1">{children}</div>
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
