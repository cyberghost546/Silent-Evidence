// =============================================================================
// app/bundles/success/page.tsx
// =============================================================================
//
// PURPOSE:
//   Confirmation page shown at /bundles/success after a user successfully
//   completes a Stripe Checkout for a story bundle. Stripe redirects to this
//   URL after a payment is processed.
//
// ACCESS:
//   Public — Stripe redirects anyone here after payment. The actual unlock
//   logic happens in the Stripe webhook handler (server-side), NOT on this
//   page. This page is purely a friendly "thank you" screen.
//
// DATA FETCHED:
//   None — this is a static confirmation page. All business logic (creating
//   the BundlePurchase record, unlocking stories) is handled by the webhook.
//
// SERVER COMPONENT:
//   No 'use client'. This renders once on the server and sends plain HTML.
//   Since there's no dynamic data, Next.js can even statically cache this page.
//
// DESIGN PATTERN:
//   "Success / thank-you" pages like this are intentionally simple. The user
//   has just completed a stressful checkout flow — reassure them quickly and
//   give them one clear CTA (call-to-action) to continue.
// =============================================================================

import Link from 'next/link';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import { PartyPopper } from 'lucide-react';

// Static metadata for the browser tab title.
export const metadata = { title: 'Bundle Purchased — Silent Evidence' };

// This component has no async data needs — it's a plain function (not async).
export default function BundleSuccessPage() {
  return (
    // flex flex-col on main ensures the footer is always pushed to the bottom,
    // even on short screens, because flex-1 on the inner div fills remaining space.
    <main className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header />

      {/* ── Centred confirmation card ─────────────────────────────────────── */}
      {/* flex-1 makes this section grow to fill the gap between header and footer */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-sm w-full text-center">
          {/* Party popper icon — celebrates the successful purchase */}
          <PartyPopper className="w-12 h-12 mx-auto mb-5 text-yellow-400" />

          <h1 className="text-2xl font-bold text-white mb-2">Bundle unlocked!</h1>

          {/* Reassurance message — tells the user what just happened */}
          <p className="text-gray-400 text-sm mb-8">
            Your purchase was successful. All stories in the bundle are now available to read.
          </p>

          {/* Primary CTA — back to the bundles listing to browse more */}
          <Link
            href="/bundles"
            className="inline-block px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm"
          >
            Browse more bundles
          </Link>

          {/* Secondary link — even quieter "back to home" option */}
          <div className="mt-4">
            <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
