'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm]               = useState({ email: '', password: '' });
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needs2fa, setNeeds2fa]       = useState(false);
  const [tempUserId, setTempUserId]   = useState<number | null>(null);
  const [twoFaCode, setTwoFaCode]     = useState('');
  const [verifying, setVerifying]     = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (res.status === 202 && data.requires2fa) {
      setTempUserId(data.tempUserId);
      setNeeds2fa(true);
      return;
    }
    if (!res.ok) { setError(data.error); return; }
    router.push('/');
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError('');

    const res  = await fetch('/api/auth/2fa/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tempUserId, code: twoFaCode }),
    });
    const data = await res.json();
    setVerifying(false);

    if (!res.ok) { setError(data.error); return; }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">

      <div className="relative w-full max-w-md">

        {/* Card with red glow shadow */}
        <div className="relative">
          {/* Red glow layer behind card */}
          <div className="absolute -inset-px rounded-2xl bg-linear-to-b from-red-600/40 to-transparent opacity-80 blur-sm" />
          <div className="absolute inset-0 rounded-2xl shadow-[0_0_80px_rgba(220,38,38,0.45)]" />

          <div className="relative bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">

            {needs2fa ? (
              /* ── 2FA step ─────────────────────────────────────────── */
              <>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold text-white">Check your email</h1>
                  <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
                    We sent a 6-digit code to your email address. Enter it below to continue.
                  </p>
                </div>

                <form onSubmit={handleVerify2fa} className="space-y-5">
                  {error && <ErrorBox message={error} />}
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
                      onChange={e => { setTwoFaCode(e.target.value); setError(''); }}
                      placeholder="000000"
                      autoFocus
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-2xl tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifying || twoFaCode.length < 6}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition text-sm shadow-lg shadow-red-900/30"
                  >
                    {verifying ? 'Verifying…' : 'Verify code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNeeds2fa(false); setTwoFaCode(''); setError(''); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Back to login
                  </button>
                </form>
              </>
            ) : (
              /* ── Standard login ───────────────────────────────────── */
              <>
                <div className="mb-7">
                  <h1 className="text-2xl font-bold text-white">Sign in</h1>
                  <p className="text-gray-500 text-sm mt-1">Welcome back to Silent Evidence</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && <ErrorBox message={error} />}

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                      Email address
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
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                        Password
                      </label>
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
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 pr-11 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 014.02-5.307M9.88 9.88a3 3 0 104.243 4.243M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition text-sm shadow-lg shadow-red-900/40 mt-1"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in…
                      </span>
                    ) : 'Sign in'}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-800 text-center">
                  <p className="text-sm text-gray-500">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-red-400 hover:text-red-300 font-medium transition">
                      Create one
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-700 mt-6">
          By signing in you agree to our{' '}
          <Link href="/terms" className="hover:text-gray-500 transition">Terms</Link>
          {' & '}
          <Link href="/privacy" className="hover:text-gray-500 transition">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      {message}
    </div>
  );
}
