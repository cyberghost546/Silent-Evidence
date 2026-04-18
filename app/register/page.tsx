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
  // HOW TO REUSE:
  //   Use this pattern whenever a form has 3+ fields. Instead of:
  //     const [username, setUsername] = useState('');
  //     const [email,    setEmail]    = useState('');
  //     ... (one per field)
  //   Use a single object so you only need one handleChange function.
  //   Add or remove keys to match whatever fields your form needs.
  //   Example for a contact form:
  //     const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });

  // ── Error state ────────────────────────────────────────────────────────────
  // Holds a single human-readable error string. Empty string = no error shown.
  //
  // HOW TO REUSE:
  //   Add `const [error, setError] = useState('');` to any form component.
  //   Set it with setError('Your message here') when validation fails or the
  //   API returns a non-OK response. Render it conditionally: {error && <div>}
  //   Clear it with setError('') on every input change so it vanishes as the
  //   user starts correcting their input.
  const [error, setError] = useState('');

  // ── Loading state ──────────────────────────────────────────────────────────
  // True while a network request is in-flight. Used to disable the submit button
  // and prevent duplicate submissions if the user clicks twice.
  //
  // HOW TO REUSE:
  //   Add `const [loading, setLoading] = useState(false);` to any async form.
  //   Set it to true before the fetch call and false in both success and error
  //   paths so the button always re-enables. Pass it to the button's `disabled`
  //   prop: disabled={loading}
  //   Optionally change the button text: {loading ? 'Saving…' : 'Save'}
  const [loading, setLoading] = useState(false);

  // ── Show/hide password toggles ────────────────────────────────────────────
  // Each password input has its own independent boolean toggle.
  //
  // HOW TO REUSE:
  //   For any password input, add a useState(false) toggle and wire it to:
  //     • type={show ? 'text' : 'password'}  on the <input>
  //     • onClick={() => setShow(v => !v)}    on a button next to the input
  //   If you only have one password field, you only need one useState.
  //   If you have two (password + confirm), declare two separate states as done
  //   here so toggling one doesn't affect the other.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  // ── Generic input handler ──────────────────────────────────────────────────
  // Updates whichever field changed without needing a separate handler per field.
  //
  // HOW TO REUSE:
  //   Copy this function as-is into any form that uses the single-object state
  //   pattern above. The only requirement is that each <input> has a `name`
  //   attribute that exactly matches a key in your form state object.
  //   The spread (...form) keeps all other fields unchanged while overwriting
  //   only the one that triggered the event.
  //   Example input: <input name="email" onChange={handleChange} />
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // Clear error on every keystroke so the banner disappears as the user corrects their input
  };

  // ── Form submission handler ────────────────────────────────────────────────
  // Validates inputs, calls the API, handles success and error responses.
  //
  // HOW TO REUSE:
  //   This is the standard pattern for any async form submit in React:
  //     1. e.preventDefault()          — stop browser default (page reload)
  //     2. client-side validation      — fast checks before touching the network
  //     3. setLoading(true)            — disable button, show loading state
  //     4. await fetch(...)            — call your API
  //     5. setLoading(false)           — re-enable button
  //     6. if (!res.ok) setError(...)  — show server error
  //     7. router.push(...)            — redirect on success
  //   Swap the fetch URL, body fields, and redirect destination for your use case.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Always call this first — prevents full page reload

    // ── Client-side validation ───────────────────────────────────────────────
    // Run cheap checks before the network call. These give instant feedback
    // without waiting 200-500ms for a server response.
    //
    // HOW TO REUSE:
    //   Add as many if-blocks here as you need. Common examples:
    //     if (!form.name.trim())         { setError('Name is required.'); return; }
    //     if (form.age < 18)             { setError('Must be 18+.'); return; }
    //     if (!form.email.includes('@')) { setError('Invalid email.'); return; }
    //   Always `return` after setError so the API call never runs on bad input.
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    // ── API call ─────────────────────────────────────────────────────────────
    // Standard fetch POST with JSON body.
    //
    // HOW TO REUSE:
    //   Replace the URL with your endpoint. Change the body fields to match
    //   what your API expects. The 'Content-Type': 'application/json' header
    //   is required whenever you send JSON — the server uses it to parse the body.
    //   We intentionally omit `confirm` from the body — it's a UI-only field.
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

    const data = await res.json();
    setLoading(false);

    // ── Handle the response ───────────────────────────────────────────────────
    // `res.ok` is true for any 2xx HTTP status code (200, 201, 204, etc.).
    // If the server returns 400/409/500, res.ok is false and data.error should
    // contain a human-readable message to show the user.
    //
    // HOW TO REUSE:
    //   This if (!res.ok) pattern works for any fetch call. Your API route just
    //   needs to return: NextResponse.json({ error: 'message' }, { status: 400 })
    //   You can also inspect the status directly: if (res.status === 409) { ... }
    if (!res.ok) {
      setError(data.error);
      return;
    }

    // ── Success — navigate away ───────────────────────────────────────────────
    // The API set a session cookie in its response headers automatically.
    // We just redirect. Change '/onboarding' to wherever new users should go.
    //
    // HOW TO REUSE:
    //   router.push('/dashboard')   — go to dashboard after sign-up
    //   router.push('/')            — go to homepage
    //   router.push('/verify-email')— go to email verification step
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">

      {/*
        ── GLOW CARD WRAPPER ────────────────────────────────────────────────────
        A `position: relative` container that holds two invisible glow layers
        stacked behind the visible card. This is a reusable "glow card" pattern.

        HOW TO REUSE THIS GLOW EFFECT IN ANOTHER PROJECT:
          Wrap any card/panel with this structure:
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-linear-to-b from-[YOUR_COLOR]/40 to-transparent opacity-80 blur-sm" />
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_80px_YOUR_COLOR_rgba]" />
              <div className="relative bg-gray-900/90 backdrop-blur-sm rounded-2xl border ...">
                YOUR CONTENT
              </div>
            </div>
          Change the color values to match your brand:
            • from-red-600/40   → from-blue-600/40  (blue glow)
            • rgba(220,38,38,…) → rgba(37,99,235,…) (blue shadow)
          Increase the /40 opacity or 0.45 alpha for a stronger glow.
          Decrease them for a subtler effect.
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
          shadow-[0_0_80px_rgba(220,38,38,0.45)] breaks down as:
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
            Plain <a> tags (not Next.js <Link>) that do a full browser redirect.
            The OAuth provider flow runs entirely server-side — these links just
            kick it off.

            HOW TO REUSE:
              1. Point href to your OAuth API routes:
                   href="/api/auth/google"     — Google
                   href="/api/auth/github"     — GitHub
                   href="/api/auth/discord"    — Discord
              2. Add or remove <a> blocks for whichever providers you support.
              3. Use <a> not <Link> — OAuth requires a real browser redirect,
                 not a client-side navigation, so the server can read the request.
              4. Style freely — the only functional part is the href.
          */}
          <div className="space-y-3 mb-6">

            {/*
              Google OAuth button.
              The SVG logo uses four official Google brand colours, one <path>
              per quadrant of the "G" lettermark. Use inline SVG instead of an
              <img> to avoid an extra network request and keep it crisp at any size.
            */}
            <a
              href="/api/auth/google"
              className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-2.5 rounded-lg transition text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            {/*
              Microsoft OAuth button.
              The logo is four coloured squares in a 2×2 grid — one <path> each.
            */}
            <a
              href="/api/auth/microsoft"
              className="flex items-center justify-center gap-3 w-full bg-[#2f2f2f] hover:bg-[#3a3a3a] text-white font-medium py-2.5 rounded-lg transition text-sm border border-gray-700"
            >
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
            creating equal lines on either side of the label text.

            HOW TO REUSE:
              Drop this block between any two sections where you want a visual
              "or" separator. Change the label text as needed.
              Works in any flexbox row — the flex-1 divs auto-size to fill space.
              Example uses: "or continue with email", "or sign in", "or use code"
          */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or register with email</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/*
            ── EMAIL REGISTRATION FORM ───────────────────────────────────────
            `space-y-4` adds a top margin between each direct child automatically.
            onSubmit calls our async handler (not the browser default).

            HOW TO REUSE:
              Copy the <form> block and adjust:
                • Add/remove <div> field blocks to match your form's fields.
                • Change the onSubmit handler to call your own API.
                • Keep `space-y-4` (or adjust the number) for consistent spacing.
          */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/*
              ── ERROR BANNER ───────────────────────────────────────────────
              Conditionally rendered — only appears when `error` is non-empty.
              The `{error && <JSX>}` pattern is the standard React way to show
              or hide a UI element based on a boolean/truthy value.

              HOW TO REUSE:
                Copy this block into any form. The only dependency is an `error`
                state variable (string). It will automatically appear/disappear
                as you call setError('message') or setError('').
                Swap the icon SVG or colours to match your design system.
            */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {/*
              ── LABEL + INPUT PATTERN ──────────────────────────────────────
              Every field follows the same three-part structure:
                1. <label htmlFor="fieldId"> — clicking the label focuses the input
                2. <input id="fieldId" name="fieldKey"> — id links to label,
                   name links to the form state key used in handleChange
                3. Tailwind classes for styling the focus ring, placeholder, etc.

              HOW TO REUSE:
                Copy one of these <div> blocks for each new field you need.
                Change: id, name, type, placeholder, autoComplete, value key.
                The className can stay identical across all text-style inputs.
                Key autoComplete values:
                  "username"      — username field
                  "email"         — email field
                  "current-password" — existing password (login)
                  "new-password"  — new password (register / change password)
                  "name"          — full name
                  "tel"           — phone number
            */}

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                id="email"
                name="email"
                type="email"       // Browser validates the @ format natively before submit
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
              The outer div is `relative` so the eye button can be positioned
              absolutely inside it without affecting document flow.
              `pr-11` adds right padding so typed text never slides under the button.

              HOW TO REUSE:
                1. Add a `const [showX, setShowX] = useState(false)` toggle state.
                2. Set `type={showX ? 'text' : 'password'}` on the input.
                3. Add a `<button type="button">` (NOT type="submit"!) that calls
                   `setShowX(v => !v)` on click.
                4. Render a different SVG icon depending on the current state.
                5. Wrap input + button in a `relative` div for absolute positioning.
                The `type="button"` on the toggle is critical — without it the
                button defaults to type="submit" and triggers form submission.
            */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
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
              The `form.confirm &&` guard prevents the field from showing red
              immediately on page load before the user has typed anything.
              A small hint text also appears below the input in real time.

              HOW TO REUSE:
                Use this pattern for any "confirm X" field (confirm email, confirm
                PIN, etc.). The key pieces:
                  1. A second state field (e.g. form.confirmEmail)
                  2. A conditional className ternary on the input border
                  3. A conditional `{field && field !== original && <p>}` hint below
                This gives instant feedback without waiting for form submission.
                The actual submission block is still in handleSubmit for safety.
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
              {/* Real-time mismatch hint — disappears once the passwords match */}
              {form.confirm && form.confirm !== form.password && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {/*
              ── SUBMIT BUTTON ─────────────────────────────────────────────
              Disabled under two conditions:
                • `loading`              — request in-flight (prevent double-submit)
                • passwords typed but mismatched (!!form.confirm converts to bool)

              HOW TO REUSE:
                Use this disabled logic pattern on any form submit button:
                  disabled={loading || someValidationFailed}
                `disabled:opacity-50` and `disabled:cursor-not-allowed` are
                Tailwind classes that automatically apply when the button is
                disabled — no extra JS needed.
                Change the loading text to match your action:
                  'Saving…', 'Uploading…', 'Sending…', 'Processing…'
            */}
            <button
              type="submit"
              disabled={loading || (!!form.confirm && form.confirm !== form.password)}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm mt-1 shadow-lg shadow-red-900/30"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>

          </form>

          {/*
            ── FOOTER LINK ───────────────────────────────────────────────────
            Next.js <Link> does client-side navigation (no page reload, bundle
            already loaded). Use it instead of <a> for all internal links.

            HOW TO REUSE:
              Always use <Link href="/path"> for internal routes in Next.js.
              Use <a href="https://..."> for external links (add target="_blank"
              rel="noopener noreferrer" for security on external links).
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
