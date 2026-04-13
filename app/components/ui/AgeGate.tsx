'use client';
// app/components/ui/AgeGate.tsx
// Enforces content rating access based on the viewer's age group.
//
// Rules:
//   UNDER_13 — can only see ContentRating.ALL stories
//   TEEN     — can see ALL + TEEN stories, blocked from MATURE
//   ADULT    — unrestricted access
//   null     — not logged in; treat same as ADULT for guests (they can click through)
//
// For MATURE content, guests see a one-time age confirmation gate (session storage).
// Logged-in users with UNDER_13 or TEEN ageGroup see a hard block with no bypass.

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AgeGroup      = 'UNDER_13' | 'TEEN' | 'ADULT' | null;
type ContentRating = 'ALL' | 'TEEN' | 'MATURE';

type Props = {
  contentRating: ContentRating;  // rating assigned to this story
  ageGroup:      AgeGroup;       // viewer's age group from their account (null = guest)
  warnings:      string[];       // legacy content warning tags (used for the guest gate)
  children:      React.ReactNode;
};

// Legacy: warnings that trigger the guest confirmation gate
const GATED_WARNINGS = ['Gore', 'Sexual Content', 'Torture', 'Self-harm', 'Suicide'];

// Whether this viewer's ageGroup can access this content rating
function canAccess(ageGroup: AgeGroup, rating: ContentRating): boolean {
  if (rating === 'ALL')    return true;                        // anyone can read ALL
  if (rating === 'TEEN')   return ageGroup !== 'UNDER_13';    // TEEN+ can read TEEN
  if (rating === 'MATURE') return ageGroup === 'ADULT' || ageGroup === null; // ADULT or guest
  return true;
}

export default function AgeGate({ contentRating, ageGroup, warnings, children }: Props) {
  const [guestAllowed, setGuestAllowed] = useState(false);
  const [checked,      setChecked]      = useState(false);

  // For guests on MATURE content: check if they've already confirmed this session
  useEffect(() => {
    if (ageGroup !== null) { setChecked(true); return; }  // logged-in: no session check needed
    if (contentRating !== 'MATURE' && !warnings.some(w => GATED_WARNINGS.includes(w))) {
      setGuestAllowed(true);
    } else if (sessionStorage.getItem('se_age_confirmed') === '1') {
      setGuestAllowed(true);
    }
    setChecked(true);
  }, [contentRating, ageGroup, warnings]);

  if (!checked) return null;

  // ── Hard block for UNDER_13 ───────────────────────────────────────────────
  if (ageGroup === 'UNDER_13' && !canAccess('UNDER_13', contentRating)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-gray-900 border border-blue-900/50 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">🔵</div>
          <h2 className="text-xl font-bold text-white mb-2">Content Not Available</h2>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            This story is rated{' '}
            <span className="font-semibold text-yellow-400">{contentRating}</span> and
            isn&apos;t available for your age group.
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Ask a parent or guardian if you have questions about your account settings.
          </p>
          <Link
            href="/"
            className="block w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-xl transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Block for TEEN trying to access MATURE ────────────────────────────────
  if (ageGroup === 'TEEN' && contentRating === 'MATURE') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-gray-900 border border-yellow-900/50 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">🔞</div>
          <h2 className="text-xl font-bold text-white mb-2">18+ Content</h2>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            This story contains mature content for adults only.
            You need to be 18 or older to read it.
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Your age group is set to{' '}
            <span className="text-yellow-400 font-semibold">Teen (13–17)</span>.
            If you&apos;re actually 18+,{' '}
            <Link href="/verify-age" className="text-red-400 hover:text-red-300 underline">
              update your age
            </Link>
            {' '}in settings.
          </p>
          <Link
            href="/"
            className="block w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-xl transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Guest gate for MATURE content (or legacy gated warnings) ─────────────
  const needsGuestGate =
    ageGroup === null &&
    (contentRating === 'MATURE' || warnings.some(w => GATED_WARNINGS.includes(w)));

  if (needsGuestGate && !guestAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-gray-900 border border-red-900/50 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Mature Content Warning</h2>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            This story is rated <span className="text-red-400 font-semibold">Mature (18+)</span>
            {warnings.some(w => GATED_WARNINGS.includes(w)) && (
              <> and contains:{' '}
                <span className="text-red-400 font-medium">
                  {warnings.filter(w => GATED_WARNINGS.includes(w)).join(', ')}
                </span>
              </>
            )}
            .
          </p>
          <p className="text-xs text-gray-500 mb-6">
            By continuing you confirm you are 18 or older.
          </p>
          <div className="flex gap-3">
            <Link
              href="/"
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-xl transition"
            >
              Go Back
            </Link>
            <button
              onClick={() => {
                sessionStorage.setItem('se_age_confirmed', '1');
                setGuestAllowed(true);
              }}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
            >
              I&apos;m 18+ — Continue
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-4">
            <Link href="/register" className="text-red-500 hover:text-red-400 underline">
              Create an account
            </Link>
            {' '}to manage your age settings permanently.
          </p>
        </div>
      </div>
    );
  }

  // ── Access granted ────────────────────────────────────────────────────────
  return <>{children}</>;
}
