'use client';
/**
 * app/login/page.tsx
 *
 * WHAT THIS FILE DOES:
 * The sign-in page. It handles two distinct flows:
 *
 *   FLOW 1 — Standard login:
 *     User enters email + password → POST /api/auth/login
 *     On success (200) → redirect to home
 *     On 2FA required (202) → switch to Flow 2
 *
 *   FLOW 2 — Two-Factor Authentication (2FA):
 *     The API sends a 6-digit code to the user's email.
 *     User enters the code → POST /api/auth/2fa/verify
 *     On success → redirect to home
 *
 * STATE OVERVIEW:
 *   form          — controlled inputs for email and password
 *   error         — inline error message shown to the user
 *   loading       — true while the login POST is in-flight
 *   showPassword  — toggles the password field between text/password type
 *   needs2fa      — true when the API says 2FA is required (switches the UI)
 *   tempUserId    — the user's ID returned by the login API for the 2FA step
 *   twoFaCode     — the 6-digit code the user types
 *   verifying     — true while the 2FA verify POST is in-flight
 *
 * HOW TO REUSE:
 * Copy the two-step form pattern (needs2fa toggle) for any multi-step form:
 *   const [step, setStep] = useState(1);
 *   // render step 1 or step 2 based on state
 * The show/hide password toggle is also reusable in any password field.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    // useRouter lets us programmatically navigate (like router.push('/'))
    const router = useRouter();

    // Single state object for the form fields — easier than two separate useState calls
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    // loading — disables the submit button while the API call is in progress
    const [loading, setLoading] = useState(false);
    // showPassword — toggles the input type between 'password' and 'text'
    const [showPassword, setShowPassword] = useState(false);

    // Two-factor authentication state
    // When the API returns requires2fa=true, we switch to the code entry step
    const [needs2fa, setNeeds2fa]           = useState(false);
    // tempUserId is sent back by the login API so we can include it in the 2FA verify call
    const [tempUserId, setTempUserId]       = useState<number | null>(null);
    const [twoFaCode, setTwoFaCode]         = useState('');
    const [verifying, setVerifying]         = useState(false);

    // Generic input handler — updates the matching key in the form object
    // e.target.name must match the `name` attribute on each input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError(''); // clear error on each keystroke for a clean UX
    };

    // Handle the standard login form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // prevent the browser from doing a full page reload
        setLoading(true);
        setError('');

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });

        const data = await res.json();
        setLoading(false);

        // HTTP 202 Accepted means "credentials correct but 2FA required"
        // The API returns a temporary userId we'll use in the next step
        if (res.status === 202 && data.requires2fa) {
            setTempUserId(data.tempUserId);
            setNeeds2fa(true); // switches the rendered UI to the 2FA panel
            return;
        }

        if (!res.ok) {
            setError(data.error);
            return;
        }

        // Success — session cookie is set by the API; navigate to home
        router.push('/');
    };

    // Verify the 6-digit 2FA code entered by the user
    const handleVerify2fa = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setError('');

        const res = await fetch('/api/auth/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Send the tempUserId so the server knows which user is verifying
            body: JSON.stringify({ tempUserId, code: twoFaCode }),
        });

        const data = await res.json();
        setVerifying(false);

        if (!res.ok) {
            setError(data.error);
            return;
        }

        // 2FA passed — session cookie is now set; navigate to home
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-xl">

                {/* ── 2FA code entry ─────────────────────────────── */}
                {needs2fa ? (
                    <>
                        <div className="mb-8">
                            <div className="text-4xl mb-3">🔐</div>
                            <h1 className="text-2xl font-bold text-white">Check your email</h1>
                            <p className="text-gray-400 text-sm mt-1">
                                We sent a 6-digit code to your email address. Enter it below to continue.
                            </p>
                        </div>

                        <form onSubmit={handleVerify2fa} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Verification code
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={twoFaCode}
                                    onChange={(e) => { setTwoFaCode(e.target.value); setError(''); }}
                                    placeholder="000000"
                                    autoFocus
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-2xl tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-red-600 transition"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={verifying || twoFaCode.length < 6}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm"
                            >
                                {verifying ? 'Verifying…' : 'Verify'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setNeeds2fa(false); setTwoFaCode(''); setError(''); }}
                                className="w-full text-sm text-gray-500 hover:text-gray-300 transition"
                            >
                                ← Back to login
                            </button>
                        </form>
                    </>
                ) : (
                    // ── Standard login form ────────────────────────────
                    <>
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-white">Sign in</h1>
                            <p className="text-gray-400 text-sm mt-1">Welcome back to Silent Evidence</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                      Password
                                  </label>
                                  {/* Link to the forgot password page */}
                                  <Link href="/forgot-password" className="text-xs text-red-400 hover:text-red-300 transition">
                                    Forgot password?
                                  </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Your password"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                        autoComplete="current-password"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                                    />
                                    {/* Eye toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 4.02-5.307M9.88 9.88a3 3 0 1 0 4.243 4.243M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm mt-2"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </form>

                        <p className="text-center text-sm text-gray-500 mt-6">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-red-400 hover:text-red-300 font-medium transition">
                                Create one
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
