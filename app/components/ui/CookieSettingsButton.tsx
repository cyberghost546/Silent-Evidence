'use client';
// app/components/ui/CookieSettingsButton.tsx
//
// Footer link that reopens the cookie banner so a visitor can change or
// withdraw a choice they already made.
//
// GDPR Art. 7(3) requires that withdrawing consent be as easy as giving it, and
// the ICO and CNIL both read that as needing a persistent, reachable control —
// not a one-time banner. Before this existed, the banner checked localStorage on
// mount and never rendered again, so the first click was permanent on that
// device. It is a button rather than a link because it changes state on the
// current page instead of navigating anywhere.

import { OPEN_EVENT } from './CookieBanner';

export default function CookieSettingsButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={className || 'text-gray-500 hover:text-white transition'}
    >
      Cookie settings
    </button>
  );
}
