'use client';
// app/reset-password/page.tsx
// Form where users set their new password after clicking the reset link.
// Reads the token from the ?token= query param.

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Redirect away if there is no token in the URL
  useEffect(() => {
    if (!token) router.replace('/forgot-password');
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: form.password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Reset failed. The link may have expired.'); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-white font-semibold">Password updated!</p>
        <p className="text-gray-400 text-sm mt-2">You can now sign in with your new password.</p>
        <Link
          href="/login"
          className="inline-block mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* New password field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
            required
            placeholder="Min. 8 characters"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
          />
          {/* Eye toggle */}
          <button type="button" onClick={() => setShowPassword(v => !v)}
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

      {/* Confirm password field */}
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
        <input
          id="confirm"
          type="password"
          value={form.confirm}
          onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setError(''); }}
          required
          placeholder="Repeat your new password"
          className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition ${
            form.confirm && form.confirm !== form.password ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {form.confirm && form.confirm !== form.password && (
          <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || (!!form.confirm && form.confirm !== form.password)}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm"
      >
        {loading ? 'Saving…' : 'Set New Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-xl">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-gray-400 text-sm mt-1">Choose a strong password for your account.</p>
        </div>
        {/* Suspense required because useSearchParams() needs it */}
        <Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
