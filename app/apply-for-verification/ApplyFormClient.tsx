/**
 * app/apply-for-verification/ApplyFormClient.tsx
 *
 * PURPOSE:
 * This is the client-side form that logged-in authors use to apply for the
 * blue verification checkmark on Silent Evidence. The parent page
 * (app/apply-for-verification/page.tsx) is a Server Component that renders
 * the static shell; this file contains all interactivity so it must be a
 * Client Component ('use client').
 *
 * STATE MODEL:
 *   reason      — controlled textarea value; the applicant's pitch (required, 20+ chars)
 *   links       — controlled textarea value; optional external profile/portfolio links
 *   submitting  — true while the POST is in-flight; disables the button to prevent double-submits
 *   success     — flipped to true after a 2xx response; swaps the form for a confirmation card
 *   error       — a string set on API or network failure; shown inline above the submit button
 *
 * FORM SUBMISSION FLOW:
 * 1. User fills in `reason` (required, max 1000 chars) and optionally `links`.
 * 2. `submit` is called on form submit — e.preventDefault() stops the browser reload.
 * 3. A POST is sent to /api/verification-request with { reason, links } as JSON.
 * 4. On success (res.ok) → setSuccess(true) replaces the form with the confirmation card.
 * 5. On API error → the error string from data.error is displayed inline.
 * 6. On network failure (catch) → a generic message is shown.
 * 7. `finally` always clears the submitting flag so the button re-enables.
 *
 * BUTTON DISABLED LOGIC:
 * disabled={submitting || reason.trim().length < 20}
 *   - `submitting` prevents double-clicks during the API call.
 *   - `reason.trim().length < 20` enforces a client-side minimum length before
 *     even hitting the network, giving instant feedback without a round-trip.
 *
 * CHARACTER COUNTER:
 * {reason.length}/1000 — a live counter shown below the textarea using the
 * controlled state value. Since `reason` is updated on every keystroke via
 * onChange, this is always in sync with what the user typed.
 *
 * CONDITIONAL RENDERING:
 * The entire form/card is controlled by `success`:
 *   success === true  → renders the green confirmation card with a "Back to dashboard" link
 *   success === false → renders the <form> element
 * This is a simple replace-on-success pattern (no routing needed).
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ApplyFormClient() {
  // Controlled value for the "why do you deserve verification" textarea
  const [reason, setReason] = useState('');
  // Controlled value for the optional external links textarea
  const [links, setLinks]   = useState('');
  // True while the POST /api/verification-request is awaited
  const [submitting, setSubmitting] = useState(false);
  // Flips to true after a successful submission — swaps form for confirmation card
  const [success, setSuccess]       = useState(false);
  // Inline error message (API error text or network failure string)
  const [error, setError]           = useState('');

  // Form submit handler — async so we can await the fetch
  const submit = async (e: React.FormEvent) => {
    // Prevent the native browser form submission (which would navigate away)
    e.preventDefault();
    // Clear any previous error so stale messages don't persist
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/verification-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, links }),
      });
      const data = await res.json();
      // Non-2xx: show the server's error message (or a fallback string)
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      // 2xx: replace the form with the success confirmation card
      setSuccess(true);
    } catch {
      // Network-level failure (no response at all)
      setError('Network error — please try again.');
    } finally {
      // Always re-enable the submit button, regardless of success or failure
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-14">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {/* Blue checkmark SVG — matches the verified badge shown on author profiles */}
          <svg className="w-5 h-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h1 className="text-2xl font-bold text-white">Apply for Verification</h1>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          The blue checkmark shows readers that you are a recognised author on Silent Evidence.
          Verified status is awarded to writers with a track record of quality stories and authentic
          engagement with the community.
        </p>
      </div>

      {/* ── Requirements checklist ──────────────────────────────────────── */}
      {/* Displayed above the form as a gentle pre-qualification reminder */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
        <p className="text-sm font-semibold text-gray-300 mb-3">Requirements</p>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2"><span className="text-green-400">✓</span>At least one published story on Silent Evidence</li>
          <li className="flex items-center gap-2"><span className="text-green-400">✓</span>A complete profile with bio and avatar</li>
          <li className="flex items-center gap-2"><span className="text-green-400">✓</span>No recent moderation actions or reported content</li>
        </ul>
      </div>

      {/*
        ── Conditional: success card OR the application form ────────────
        We use a ternary so only one branch is mounted at a time.
        After success, the form is completely replaced — no stale state issues.
      */}
      {success ? (
        /* ── Success confirmation card ─────────────────────────────────── */
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Application received!</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Thank you for applying. Our team reviews applications manually and will update your
            profile if approved. You&apos;ll receive a notification when a decision is made.
          </p>
          {/* Next.js Link pre-fetches /dashboard for instant navigation */}
          <Link href="/dashboard" className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition">
            Back to dashboard
          </Link>
        </div>
      ) : (
        /* ── Application form ──────────────────────────────────────────── */
        <form onSubmit={submit} className="space-y-6">

          {/* Reason textarea — required, 20-char minimum enforced by disabled attr */}
          <div>
            <label htmlFor="reason" className="block text-sm font-semibold text-gray-300 mb-2">
              Why do you deserve verification? <span className="text-red-400">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              // Update controlled state on every keystroke
              onChange={e => setReason(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Tell us about your writing, your stories, and why verified status would matter to your readers…"
              // focus:border-red-600 — red border on focus matches the site's danger/active colour
              className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm resize-none outline-none transition"
              required
            />
            {/* Live character counter — reason.length is always current because `reason` is controlled */}
            <p className="text-xs text-gray-600 mt-1 text-right">{reason.length}/1000</p>
          </div>

          {/* Links textarea — optional, helps reviewers verify the applicant's identity */}
          <div>
            <label htmlFor="links" className="block text-sm font-semibold text-gray-300 mb-2">
              External links <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="links"
              value={links}
              onChange={e => setLinks(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Any external profiles, published works, or social links that support your application…"
              className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm resize-none outline-none transition"
            />
          </div>

          {/*
            Inline error banner — only rendered when `error` is non-empty.
            bg-red-500/10 is a very subtle tinted background; border adds definition.
          */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
          )}

          {/*
            Submit button — disabled in two cases:
              1. While the API call is in-flight (submitting === true)
              2. Before the user has typed at least 20 meaningful characters
            This prevents both double-submits and trivially short applications.
          */}
          <button
            type="submit"
            disabled={submitting || reason.trim().length < 20}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
          >
            {/* Label changes to indicate in-progress state */}
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      )}
    </div>
  );
}
