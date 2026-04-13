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
// Tutorial — first-visit walkthrough overlay, also accessible via the ? button
import Tutorial from "./components/ui/Tutorial";
import { prisma } from "@/lib/prisma";
// Validates required env vars at startup — throws a clear error if any are missing
import { validateEnv } from "@/lib/env";

// Run validation once when the server starts up
validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

export const metadata: Metadata = {
  title: {
    // Individual pages set their own title; this is the fallback and template
    default: "Silent Evidence",
    template: "%s — Silent Evidence",
  },
  description: "A community for real horror stories — true crime, paranormal encounters, unexplained disappearances, and campfire tales from people who were actually there.",
  metadataBase: new URL(SITE_URL),

  // OpenGraph — controls how the link looks when shared on Facebook, Discord, WhatsApp etc.
  openGraph: {
    type:        "website",
    siteName:    "Silent Evidence",
    title:       "Silent Evidence — Real Horror Stories",
    description: "True crime, paranormal encounters, and campfire tales from people who were actually there.",
    url:         SITE_URL,
    images: [
      {
        url:    "/icons/icon-512x512.png",
        width:  512,
        height: 512,
        alt:    "Silent Evidence",
      },
    ],
  },

  // Twitter/X card — shown when a link is shared on Twitter/X
  twitter: {
    card:        "summary_large_image",
    title:       "Silent Evidence — Real Horror Stories",
    description: "True crime, paranormal encounters, and campfire tales from people who were actually there.",
    images:      ["/icons/icon-512x512.png"],
  },

  // PWA meta tags — tell iOS/Android this is an installable app
  appleWebApp: {
    capable:         true,
    statusBarStyle:  "black-translucent",
    title:           "Silent Evidence",
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
  // Fetch the current announcement message (empty string = no banner shown)
  const announcementRow = await prisma.siteSetting
    .findUnique({ where: { key: 'announcement' } })
    .catch(() => null);
  const announcement = announcementRow?.value ?? '';

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
        {/* Tutorial — auto-opens on first visit, reopenable via the ? button */}
        <Tutorial />
      </body>
    </html>
  );
}
