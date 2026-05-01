'use client';
/**
 * app/register/page.tsx — Registration page
 *
 * ── WHAT THIS FILE DOES ──────────────────────────────────────────────────────
 * Lets a new visitor create an account. There are two ways to register:
 *
 *   FLOW 1 — OAuth (one-click):
 *     Clicking "Continue with Google" or "Continue with Microsoft" redirects
 *     the browser to /api/auth/google or /api/auth/microsoft. Those API routes
 *     handle the OAuth handshake entirely on the server, set a session cookie,
 *     and redirect back to /onboarding when done. No React state is involved.
 *
 *   FLOW 2 — Email + password form:
 *     User fills in username, email, password, and confirm password.
 *     On submit → POST /api/auth/register with the three valid fields.
 *     On success → navigate to /onboarding (the welcome wizard).
 *     On failure → show the server error message inline.
 *
 * ── WHY 'use client'? ────────────────────────────────────────────────────────
 *   This component needs React hooks (useState, useRouter) and responds to
 *   browser events (form submit, input change). These are only available in
 *   Client Components. Server Components can't use hooks or event handlers.
 *
 * ── HOW TO REUSE THIS FILE IN ANOTHER PROJECT ────────────────────────────────
 * 1. Copy the entire file into your Next.js `app/register/` folder.
 * 2. Change the fetch URL from '/api/auth/register' to your own register endpoint.
 * 3. Update the redirect from '/onboarding' to wherever new users should land
 *    (e.g. '/dashboard', '/welcome', '/').
 * 4. If you don't need OAuth, delete the OAuth buttons section entirely.
 * 5. If you want extra fields (e.g. full name, phone), add a new key to the
 *    `form` state object and a matching <input name="fieldName"> in the JSX.
 * 6. Swap out the Tailwind colour classes (red-600 → your brand colour) and
 *    the card background (gray-900 → your site background) to match your theme.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  // ── useRouter ─────────────────────────────────────────────────────────────
  // Gives us router.push() for client-side navigation without a full page reload.
  //
  // HOW TO REUSE:
  //   Import and call useRouter() in any 'use client' component that needs to
  //   redirect after an async action (login, form submit, payment, etc.).
  //   Example:
  //     const router = useRouter();
  //     router.push('/dashboard');   // navigate forward
  //     router.replace('/login');    // navigate without adding to history
  //     router.back();               // go back one step
  const router = useRouter();

  // ── Single-object form state ───────────────────────────────────────────────
  // One useState call holds all field values in a plain object.
  //
  // WHY ONE OBJECT instead of separate useState per field?
  //   With 4+ fields, one object lets you use a single generic handleChange
  //   function instead of writing setUsername, setEmail, setPassword separately.
  //   The spread operator (...form) copies existing values and the computed
  //   property [e.target.name] overwrites only the field that changed.
  //
  // HOW TO REUSE:
  //   Add or remove keys to match whatever fields your form needs.
  //   Example for a contact form:
  //     const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });

  // ── Error state ────────────────────────────────────────────────────────────
  // Holds a single human-readable error string. Empty string = no error shown.
  //
  // WHY A STRING (not boolean)?
  //   Storing the message directly lets us display it verbatim from the server
  //   without a separate lookup table. Clearing it (setError('')) hides the UI.
  const [error, setError] = useState('');

  // ── Loading state ──────────────────────────────────────────────────────────
  // True while a network request is in-flight. Used to:
  //   1. Disable the submit button (prevents double-submission)
  //   2. Change button text to 'Creating account…' to signal progress
  //   3. Optionally show a spinner (not implemented here but easy to add)
  const [loading, setLoading] = useState(false);

  // ── Show/hide password toggles ────────────────────────────────────────────
  // Each password input has its own independent boolean toggle so that showing
  // one doesn't accidentally reveal the other.
  //
  // HOW TO REUSE:
  //   For a single password field: const [showPassword, setShowPassword] = useState(false);
  //   For two fields: declare two separate states as done here.
  //   Wire each to: type={showX ? 'text' : 'password'} on the <input>
  //              and onClick={() => setShowX(v => !v)} on the eye button.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  // ── Generic input handler ──────────────────────────────────────────────────
  // Updates whichever field changed without a separate handler per field.
  //
  // HOW IT WORKS:
  //   e.target.name matches the `name` attribute on the <input>.
  //   [e.target.name] is a computed property key — JavaScript evaluates the
  //   expression inside [] to produce the key string.
  //   Spread (...form) copies all current values, then the computed key
  //   overwrites just that one field.
  //
  // setError('') clears any existing error on every keystroke so stale error
  // messages disappear immediately as the user starts correcting input.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // Clear error on every keystroke so the banner disappears as the user corrects their input
  };

  // ── Form submission handler ────────────────────────────────────────────────
  // Validates inputs, calls the API, handles success and error responses.
  //
  // PATTERN — standard async form submit in React:
  //   1. e.preventDefault()          — stop browser default (page reload)
  //   2. client-side validation      — fast checks before touching the network
  //   3. setLoading(true)            — disable button, show loading state
  //   4. await fetch(...)            — call your API
  //   5. setLoading(false)           — re-enable button (in all branches)
  //   6. if (!res.ok) setError(...)  — show server error
  //   7. router.push(...)            — redirect on success
  const handleSubmit = async (e: React.FormEvent) => {
    // e.preventDefault() stops the browser from submitting the form as a
    // traditional HTTP POST (which would cause a full page reload and lose state).
    // This must be called first, before any other logic.
    e.preventDefault();

    // ── Client-side validation ───────────────────────────────────────────────
    // Run cheap checks before the network call. These give instant feedback
    // without waiting ~200-500ms for a server round-trip.
    //
    // Always `return` after setError so the API call never fires on bad input.
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    // Lock the button and clear any previous error before the async call
    setLoading(true);
    setError('');

    // ── API call ─────────────────────────────────────────────────────────────
    // Standard JSON POST. The 'Content-Type': 'application/json' header tells
    // the server how to parse the body (req.json() in Next.js API routes).
    // We intentionally omit `confirm` — it's a UI-only field for comparison,
    // not a field the server expects or stores.
    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        username: form.username,
        email:    form.email,
        password: form.password,
        // `confirm` is deliberately excluded — it's only needed client-side
      }),
    });

    // Parse the JSON body from the response regardless of status code.
    // On failure, the server returns { error: 'message' } so we can show it.
    const data = await res.json();

    // Always re-enable the button (even on failure) so the user can retry
    setLoading(false);

    // ── Handle the response ───────────────────────────────────────────────────
    // `res.ok` is true for HTTP 200-299. For 400/409/500, res.ok is false and
    // data.error should contain a human-readable message from the server.
    //
    // API route convention used here:
    //   Success: NextResponse.json({ ok: true })          status 200
    //   Failure: NextResponse.json({ error: 'msg' })     status 400/409
    if (!res.ok) {
      setError(data.error);
      return; // Stop — do not navigate
    }

    // ── Success — navigate away ───────────────────────────────────────────────
    // The API route set a session cookie in its Set-Cookie response header.
    // The browser stored it automatically. We just redirect.
    // router.push adds /onboarding to the browser history so the user can go back.
    router.push('/onboarding');
  };

  return (
    // Full-screen centred layout — flex+items-center+justify-center centres
    // the card both vertically and horizontally. px-4 prevents edge clipping on mobile.
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">

      {/*
        ── GLOW CARD WRAPPER ────────────────────────────────────────────────────
        A `position: relative` container stacks two invisible glow layers
        behind the visible card using CSS painting order (absolute divs behind
        the relative card div).

        HOW THE GLOW EFFECT WORKS:
          Layer 1 (-inset-px, blurred gradient) → soft coloured border glow
          Layer 2 (inset-0, box-shadow)          → outer halo
          Card    (relative, bg-gray-900/90)     → sits above both layers

        HOW TO REUSE THIS GLOW EFFECT:
          Wrap any card with this exact three-div structure and change the
          colour values (red-600 → blue-600, rgba(220,38,38) → rgba(37,99,235)).
          Increase the opacity number for a stronger glow, decrease for subtler.
      */}
      <div className="relative w-full max-w-md">

        {/*
          GLOW LAYER 1 — blurred gradient creates a soft coloured border glow.
          `-inset-px` expands this div 1px outside its parent on all sides,
          so the gradient bleeds around the card's edge.
          `bg-linear-to-b from-red-600/40 to-transparent` fades red → clear
          from top to bottom, so only the top edge of the card glows.
          `blur-sm` softens the edge so it looks like real light spill.
        */}
        <div className="absolute -inset-px rounded-2xl bg-linear-to-b from-red-600/40 to-transparent opacity-80 blur-sm" />

        {/*
          GLOW LAYER 2 — wide box-shadow creates the outer red halo.
          This div has no background. Its only purpose is to carry the shadow.
          shadow-[0_0_80px_rgba(220,38,38,0.45)] breakdown:
            0px   → horizontal offset (centred)
            0px   → vertical offset (centred)
            80px  → blur radius (how far the glow spreads outward)
            rgba  → red-600 at 45% opacity
          Using a separate div (instead of shadow on the card itself) prevents
          the shadow from being clipped by the card's border-radius.
        */}
        <div className="absolute inset-0 rounded-2xl shadow-[0_0_80px_rgba(220,38,38,0.45)]" />

        {/*
          THE CARD — sits above both glow layers because `relative` creates a
          new stacking context on top of the `absolute` glow divs.
          `bg-gray-900/90` — 90% opaque so the glow very faintly bleeds through.
          `backdrop-blur-sm` — blurs whatever is behind the card, giving a
          frosted-glass effect that makes the surrounding glow look more luminous.
        */}
        <div className="relative w-full max-w-md bg-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-800 p-8">

          {/* ── Page heading ───────────────────────────────────────────────── */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white">Create an account</h1>
            <p className="text-gray-400 text-sm mt-1">Join Silent Evidence today</p>
          </div>

          {/*
            ── OAUTH BUTTONS ─────────────────────────────────────────────────
            Plain <a> tags (not Next.js <Link>) perform a full browser redirect.
            OAuth requires a real HTTP redirect so the server can read the
            request origin and set cookies — client-side navigation wouldn't work.

            HOW OAUTH FLOWS WORK HERE:
              1. User clicks the link → browser navigates to /api/auth/google
              2. The API route redirects to Google's authorization URL
              3. Google authenticates the user and redirects back to our callback
              4. The callback API route creates/updates the user, sets a session
                 cookie, and redirects to /onboarding
              5. The browser follows the final redirect — user is now logged in
          */}
          <div className="space-y-3 mb-6">

            {/*
              Google OAuth button.
              The SVG logo uses four official Google brand colours, one <path>
              per quadrant of the "G" lettermark. Inline SVG avoids an extra
              network request and stays crisp at any size (vector graphic).
            */}
            <a
              href="/api/auth/google"
              // White bg for Google (matches their brand guidelines)
              // hover:bg-gray-100 adds a subtle hover effect
              className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-2.5 rounded-lg transition text-sm"
            >
              {/* Official Google "G" logo as inline SVG — four quadrant colours */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            {/*
              Microsoft OAuth button — dark background matches Microsoft's dark UI.
              The logo is four coloured squares in a 2×2 grid — one <path> each.
            */}
            <a
              href="/api/auth/microsoft"
              // bg-[#2f2f2f] — custom hex value for Microsoft's dark button colour
              // border-gray-700 separates it from the card background
              className="flex items-center justify-center gap-3 w-full bg-[#2f2f2f] hover:bg-[#3a3a3a] text-white font-medium py-2.5 rounded-lg transition text-sm border border-gray-700"
            >
              {/* Official Microsoft logo — four squares, each a brand colour */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
              Continue with Microsoft
            </a>
          </div>

          {/*
            ── OR DIVIDER ────────────────────────────────────────────────────
            Two `flex-1 h-px` divs grow to fill remaining horizontal space,
            creating equal lines on either side of the "or" label.

            HOW IT WORKS:
              The container is flex with items-center. The two `flex-1` divs
              each take up equal shares of the remaining space after the span
              renders. `h-px` = 1px height; `bg-gray-800` colours the line.
          */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or register with email</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/*
            ── EMAIL REGISTRATION FORM ───────────────────────────────────────
            `space-y-4` applies margin-top: 16px to every direct child except
            the first — Tailwind's way to space form rows without gap hacks.
            onSubmit={handleSubmit} — React calls our async handler; the browser
            default (page reload) is cancelled inside handleSubmit via e.preventDefault().
          */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/*
              ── ERROR BANNER ───────────────────────────────────────────────
              {error && <JSX>} — conditional rendering. The expression evaluates
              to false (falsy empty string) when there's no error, so React renders
              nothing. When error is set, the whole div appears.

              WHY THIS APPROACH:
                A single error string is simpler than a boolean + message pair.
                The banner auto-hides when setError('') is called on every keystroke.
            */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {/* Warning icon — shrink-0 prevents it from squishing if the message wraps */}
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {/*
              ── LABEL + INPUT PATTERN ──────────────────────────────────────
              Every field uses the same three-part structure:
                1. <label htmlFor="id"> — clicking the label focuses the input
                   (htmlFor in JSX = `for` attribute in HTML)
                2. <input id="id" name="key"> — id connects to label;
                   name must match the key in the form state object so
                   handleChange can find and update the right field with
                   [e.target.name]
                3. Tailwind classes — consistent visual style across all inputs

              IMPORTANT: `name` and `id` serve different purposes:
                `id`   → links the <label> for click-to-focus accessibility
                `name` → used by handleChange as a key into the form state object
            */}

            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
              <input
                id="username"
                name="username"           // Must match form state key
                type="text"
                placeholder="johndoe"
                value={form.username}     // Controlled input — value bound to state
                onChange={handleChange}   // Generic handler updates form.username
                required                  // HTML5 native validation — blocks submit if empty
                autoComplete="username"  // Hints browser autofill to use saved usernames
                // focus:ring-2 focus:ring-red-600 — shows a red ring on focus
                // focus:border-transparent — removes the gray border when ring is active
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              />
            </div>

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                id="email"
                name="email"
                type="email"               // Browser validates the @ format natively before submit fires
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              />
            </div>

            {/*
              ── PASSWORD FIELD WITH SHOW/HIDE TOGGLE ──────────────────────
              The outer div is `relative` so the eye button can sit inside it
              using `absolute right-3 top-1/2 -translate-y-1/2` positioning
              without affecting document flow.
              `pr-11` adds right padding so typed text never slides under the button.

              CRITICAL: The toggle button must be `type="button"`.
                Without it, the button defaults to type="submit" and clicking
                the eye icon would submit the form instead of toggling visibility.
            */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  // Ternary toggles between plain text and hidden dots
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"  // Tells password managers this is a new PW, not login
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
                <button
                  type="button"          // MUST be "button" — prevents accidental form submit
                  onClick={() => setShowPassword(v => !v)}  // Functional update flips the boolean
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  // aria-label describes the action to screen readers (the SVG icon has no text)
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {/* Conditionally render eye-slash or eye icon based on current visibility */}
                  {showPassword ? (
                    // Eye-slash = currently showing plain text → click to hide
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 014.02-5.307M9.88 9.88a3 3 0 104.243 4.243M3 3l18 18" />
                    </svg>
                  ) : (
                    // Eye = currently hidden → click to reveal
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/*
              ── CONFIRM PASSWORD WITH LIVE MISMATCH FEEDBACK ──────────────
              The border colour switches dynamically based on a ternary:
                form.confirm && form.confirm !== form.password
                  → 'border-red-500'   (user typed something and it doesn't match)
                  → 'border-gray-700'  (empty OR matching — normal state)

              WHY `form.confirm &&` first?
                Without this guard, the red border would appear immediately on
                page load before the user has typed anything (because '' !== '').
                The guard ensures we only show the error after the user has
                started typing in the confirm field.
            */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  // Template literal switches border colour based on mismatch state
                  className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 pr-11 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition ${
                    form.confirm && form.confirm !== form.password
                      ? 'border-red-500'
                      : 'border-gray-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 014.02-5.307M9.88 9.88a3 3 0 104.243 4.243M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Real-time mismatch hint — disappears once passwords match.
                  Same guard condition as the border colour above. */}
              {form.confirm && form.confirm !== form.password && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {/*
              ── SUBMIT BUTTON ─────────────────────────────────────────────
              Disabled when:
                • `loading` is true — a request is already in-flight
                • Passwords typed but don't match (!!form.confirm converts to bool)

              WHY disabled PREVENTS DOUBLE-SUBMIT:
                HTML `disabled` prevents the button from firing click events AND
                prevents form submit events from firing. Combined with setLoading,
                this gives double protection against duplicate API calls.

              Tailwind disabled: modifier classes auto-apply when disabled:
                `disabled:opacity-50`        — visual indicator the button is inactive
                `disabled:cursor-not-allowed` — cursor change for UX clarity
            */}
            <button
              type="submit"
              disabled={loading || (!!form.confirm && form.confirm !== form.password)}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm mt-1 shadow-lg shadow-red-900/30"
            >
              {/* Conditional button text — changes during the async operation */}
              {loading ? 'Creating account…' : 'Create account'}
            </button>

          </form>

          {/*
            ── FOOTER LINK ───────────────────────────────────────────────────
            Next.js <Link> does client-side navigation (no page reload, bundle
            already loaded). Use it instead of <a> for all internal routes.

            {' '} inserts a non-breaking space between the two text nodes —
            required in JSX when concatenating inline text across multiple elements.
          */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-red-400 hover:text-red-300 font-medium transition">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
