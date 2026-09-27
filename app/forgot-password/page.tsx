/**
 * app/forgot-password/page.tsx
 *
 * WHAT THIS FILE DOES:
 * Renders the "Forgot Password" form where unauthenticated users enter their
 * email address to receive a one-time password-reset link.
 *
 * CLIENT COMPONENT ('use client'):
 * This page is a Client Component because it manages interactive state
 * (loading spinner, success/error messages, controlled input value) via
 * React's useState hook. Server Components cannot use hooks.
 *
 * TWO-PHASE UI PATTERN:
 * The component renders two mutually-exclusive views controlled by the `sent`
 * boolean state:
 *   1. The email form  (sent === false)
 *   2. A success confirmation (sent === true)
 * Switching between them is as simple as setSent(true) after a successful API call.
 *
 * SECURITY NOTE — deliberate ambiguity:
 * The success message says "If an account exists for …" rather than confirming
 * whether the email matched a real account. This prevents user enumeration:
 * an attacker cannot tell which email addresses are registered.
 *
 * API CALL:
 * POST /api/auth/forgot-password  { email }
 *   → 200 OK         — email dispatched (or silently skipped if unknown)
 *   → 4xx/5xx        — returns { error: string }
 *
 * HOW TO REUSE:
 * This two-phase "submit → success screen" pattern works for any one-shot
 * action (email verification, newsletter sign-up, etc.).
 * Replace the fetch URL and message copy as needed.
 */

'use client';
// Required for useState — this marks the file as a Client Component.
// Without 'use client', React hooks would throw a build error.
// app/forgot-password/page.tsx
// Form where users enter their email to receive a password reset link.

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  // --- State ---
  // Controlled input value for the email field
  const [email, setEmail] = useState('');

  // True while the POST request is in-flight — used to disable the button
  // and show a "Sending…" label so the user knows something is happening
  const [loading, setLoading] = useState(false);

  // Flips to true after a successful API response, replacing the form with a
  // success message. Never goes back to false in this session.
  const [sent, setSent] = useState(false);

  // Holds an error string to display in the red alert box.
  // Cleared before every new request so stale errors don't linger.
  const [error, setError] = useState('');

  // --- Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the browser's native form submission (which would reload the page)
    e.preventDefault();

    // Optimistic UI: show spinner immediately before the network request starts
    setLoading(true);
    setError(''); // clear any previous error

    // Send the email to the server-side API route.
    // We use a JSON body rather than FormData so the route handler can call
    // res.json() without parsing multipart encoding overhead.
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    // Re-enable the button regardless of outcome
    setLoading(false);

    // If the server returned a non-2xx status, extract the error message.
    // The `?? 'Something went wrong.'` fallback handles cases where the
    // server response body doesn't include an `error` field.
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }

    // Success — flip to the confirmation view
    setSent(true);
  };

  return (
    // Full-viewport dark background, centered card layout
    // `min-h-screen` ensures the background fills tall viewports
    // `flex items-center justify-center` centers the card both axes
    // `px-4` adds horizontal padding so the card doesn't touch screen edges on mobile
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Card container — max-w-md caps width on wide screens */}
      <div className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-xl">
        {/* Page heading */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-gray-400 text-sm mt-1">
            Enter your email and we&apos;ll send you a reset link.
            {/* &apos; is the JSX entity for an apostrophe. Using it avoids
                the React ESLint warning about unescaped apostrophes in JSX. */}
          </p>
        </div>

        {/* Conditional rendering:
            - sent === true  → show the success screen (no form elements)
            - sent === false → show the form
            This is the standard React "replace view on success" pattern */}
        {sent ? (
          // --- SUCCESS STATE ---
          // Shown after the email is dispatched. The user sees a mailbox icon,
          // a reassuring message, and a link back to sign-in.
          <div className="text-center py-6">
            <p className="text-white font-semibold">Check your inbox</p>
            <p className="text-gray-400 text-sm mt-2">
              {/* Display the email they submitted so they know which inbox to check.
                  The deliberate "If an account exists for …" wording prevents
                  user enumeration — attackers cannot tell which emails are real. */}
              If an account exists for <span className="text-white">{email}</span>, you&apos;ll
              receive a reset link shortly.
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 text-sm text-red-400 hover:text-red-300 transition"
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          // --- FORM STATE ---
          // Standard controlled form: value ↔ state, submit → async handler
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error alert — only rendered when `error` is a non-empty string.
                `bg-red-500/10` is Tailwind's opacity modifier: red-500 at 10% opacity
                for a subtle tinted background without a solid red block. */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Email input */}
            <div>
              {/* htmlFor must match the input's id for screen-reader label association */}
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email" // triggers the browser's built-in email format validation
                value={email} // controlled: React state drives the displayed value
                onChange={(e) => setEmail(e.target.value)} // update state on every keystroke
                required // HTML5 validation — prevents submit if empty
                placeholder="you@example.com"
                autoComplete="email" // browser autofill hint for password managers
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                // focus:outline-none removes the default browser outline
                // focus:ring-2 focus:ring-red-600 adds a custom red focus ring
                // focus:border-transparent hides the border when focused (ring replaces it)
              />
            </div>

            {/* Submit button
                disabled={loading} prevents double-submissions while the request is in-flight.
                disabled:opacity-50 and disabled:cursor-not-allowed give clear visual feedback. */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              {/* Ternary shows a loading label while the request is pending */}
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            {/* "Back to Sign In" — secondary navigation link below the button */}
            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-red-400 hover:text-red-300 transition">
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
