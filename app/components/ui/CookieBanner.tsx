'use client';
// app/components/ui/CookieBanner.tsx
// GDPR-compliant cookie consent banner shown once to every new visitor.
// The banner appears at the bottom of the screen and offers three choices:
//   • Accept All     — enables analytics + marketing cookies
//   • Essential Only — only strictly necessary cookies (session, auth)
//   • Reject All     — records rejection; no optional cookies set
//
// The user's choice is:
//   1. Saved to localStorage so the banner never shows again on this device.
//   2. Sent to /api/cookie-consent so admins can see consent rates in the dashboard.
//
// The banner only shows after hydration (useEffect) to avoid SSR mismatch.

import { useEffect, useState } from 'react';
import Link from 'next/link';

const LS_KEY = 'se_cookie_consent';

/** Fired by CookieSettingsButton to reopen the banner so a choice can be changed. */
export const OPEN_EVENT = 'se:open-cookie-settings';

type Choice = 'all' | 'essential' | 'rejected';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // After the component mounts, check localStorage.
  // If no choice has been saved yet, show the banner.
  useEffect(() => {
    if (!localStorage.getItem(LS_KEY)) {
      setVisible(true);
    }
  }, []);

  // GDPR Art. 7(3): withdrawing consent must be as easy as giving it. Once a
  // choice was stored there was no way to reach the banner again from anywhere
  // in the UI, so a reader who clicked "Accept all" could never take it back.
  // The "Cookie settings" link in the footer dispatches this event to reopen it.
  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  const choose = async (choice: Choice) => {
    if (saving) return;
    setSaving(true);
    // Persist choice locally so the banner never reappears
    localStorage.setItem(LS_KEY, choice);
    // Record the consent server-side (fire-and-forget; banner hides immediately)
    fetch('/api/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice }),
    }).catch(() => {});
    setVisible(false);
  };

  if (!visible) return null;

  return (
    // Fixed to the bottom of the screen; z-50 keeps it above all page content
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-950 border-t border-gray-800 shadow-2xl">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Cookie icon + text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">We use cookies</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              We use essential cookies to keep you logged in, and optional analytics cookies to
              understand how readers use Silent Evidence. No tracking without your consent.{' '}
              <Link
                href="/privacy"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Privacy policy
              </Link>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => choose('rejected')}
            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={() => choose('essential')}
            className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 rounded-lg transition"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
