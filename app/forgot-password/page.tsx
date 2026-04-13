'use client';
// app/forgot-password/page.tsx
// Form where users enter their email to receive a password reset link.

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 p-8 shadow-xl">

        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-gray-400 text-sm mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {/* Success state — shown after the email is sent */}
        {sent ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">📬</div>
            <p className="text-white font-semibold">Check your inbox</p>
            <p className="text-gray-400 text-sm mt-2">
              If an account exists for <span className="text-white">{email}</span>, you&apos;ll receive a reset link shortly.
            </p>
            <Link href="/login" className="inline-block mt-6 text-sm text-red-400 hover:text-red-300 transition">
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-red-400 hover:text-red-300 transition">Back to Sign In</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
