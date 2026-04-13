'use client';
/**
 * ReadingPaywall.tsx
 *
 * WHAT THIS FILE DOES:
 * This is a full-screen overlay (modal) shown when a free-tier user tries to
 * read more stories than their monthly limit allows. It blurs the story content
 * behind the modal so the reader gets a "tease" of the content but can't actually
 * read it until they upgrade.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Drop this wherever you want to gate content behind a subscription.
 * 2. Pass in how many items the user has consumed and the limit.
 * 3. Update the Link href="/premium" to point to your own upgrade/pricing page.
 * 4. Swap out the feature list bullets with your own plan perks.
 *
 * Example usage:
 *   <ReadingPaywall readThisMonth={10} limit={10} />
 *
 * This component renders as a fixed overlay that covers the entire viewport.
 * Make sure the story content is already rendered behind it — the parent
 * should handle the blur effect on the content container.
 */

import Link from 'next/link';

// Props — the two numbers we need to personalise the message
type Props = {
  // How many stories the user has already read this calendar month
  readThisMonth: number;
  // The total number of free reads allowed per month (e.g. 10)
  limit: number;
};

// ReadingPaywall — the main (and only) component in this file.
// It receives the counts and renders a fixed, centered card over the page.
export default function ReadingPaywall({ readThisMonth, limit }: Props) {
  return (
    // Outer wrapper: "fixed inset-0" stretches across the entire screen.
    // "z-50" puts it on top of everything else on the page.
    // "bg-black/80 backdrop-blur-sm" creates the dark blurred overlay behind the card.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">

      {/* The white card in the center — max-w-md keeps it from stretching too wide */}
      <div className="mx-4 max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-8 text-center shadow-2xl">

        {/* Big lock emoji — immediately communicates "you're blocked" */}
        <div className="mb-4 text-5xl">🔒</div>

        {/* Personalised count — shows "You've read 10 of 10 free stories" */}
        <h2 className="mb-2 text-2xl font-bold text-white">
          You&apos;ve read {readThisMonth} of {limit} free stories
        </h2>

        {/* Pitch for upgrading — the "why" that motivates the click */}
        <p className="mb-6 text-gray-400">
          Upgrade to <span className="font-semibold text-red-500">Silent Evidence Premium</span> for
          unlimited horror stories, exclusive content, and no reading limits.
        </p>

        {/* Bullet list of premium perks — edit these to match your product's selling points */}
        <ul className="mb-6 space-y-2 text-left text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <span className="text-red-500">✓</span> Unlimited story reading
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-500">✓</span> Access to MATURE-rated horror stories
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-500">✓</span> Exclusive premium story bundles
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-500">✓</span> Support your favorite horror authors
          </li>
        </ul>

        {/* Two-button layout: primary CTA and a softer "go back" option */}
        <div className="flex flex-col gap-3">
          {/* Primary button — big, red, goes to the upgrade/pricing page */}
          <Link
            href="/premium"
            className="block rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Upgrade to Premium
          </Link>

          {/* Secondary link — lets the user back out without committing */}
          <Link
            href="/"
            className="block text-sm text-gray-500 transition hover:text-gray-300"
          >
            Browse free stories instead
          </Link>
        </div>

        {/* Small reassurance note — explains when the limit resets */}
        <p className="mt-4 text-xs text-gray-600">
          Your free reads reset on the 1st of each month.
        </p>
      </div>
    </div>
  );
}
