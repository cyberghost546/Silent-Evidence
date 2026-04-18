'use client';
// app/verify-age/AgeVerificationForm.tsx
// Date-of-birth entry form. Submits to /api/user/age which returns ageGroup.
// After saving, shows the result (access level) and redirects to home.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Map ageGroup to a human-readable access level description
const ACCESS_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  UNDER_13: {
    label: 'Kids Mode',
    desc:  'You can read all general horror stories rated for everyone.',
    color: 'text-blue-400',
  },
  TEEN: {
    label: 'Teen Access',
    desc:  'You can read general and teen-rated content. Mature stories are restricted.',
    color: 'text-yellow-400',
  },
  ADULT: {
    label: 'Full Access',
    desc:  'You have unrestricted access to all content on the site.',
    color: 'text-green-400',
  },
};

export default function AgeVerificationForm() {
  const router = useRouter();

  const [dob,      setDob]      = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [result,   setResult]   = useState<{ ageGroup: string; age: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dob) { setError('Please enter your date of birth.'); return; }

    setSaving(true);
    const res = await fetch('/api/user/age', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dateOfBirth: dob }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.');
      setSaving(false);
      return;
    }

    // Show the result briefly before redirecting
    setResult(data);
    setSaving(false);
    setTimeout(() => router.push('/'), 3000);
  };

  const access = result ? ACCESS_LABELS[result.ageGroup] : null;

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">

        {!result ? (
          // ── Entry form ───────────────────────────────────────────────────────
          <>
            <div className="text-center mb-7">
              <div className="text-5xl mb-3">🎂</div>
              <h1 className="text-2xl font-bold text-white mb-2">How old are you?</h1>
              <p className="text-sm text-gray-400 leading-relaxed">
                We need your date of birth to make sure you only see content
                that&apos;s right for your age. This is stored securely and
                never shared.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                  Date of Birth
                </label>
                <input
                  id="dob"
                  suppressHydrationWarning
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  // Restrict to realistic range
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm"
              >
                {saving ? 'Saving…' : 'Confirm Age'}
              </button>
            </form>

            {/* Content rating preview */}
            <div className="mt-6 border-t border-gray-800 pt-5 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                How it works
              </p>
              {[
                { icon: '🔵', age: 'Under 13', desc: 'General content only — no gore or explicit content' },
                { icon: '🟡', age: '13 – 17',  desc: 'General + teen content — some violence, no explicit' },
                { icon: '🟢', age: '18+',       desc: 'Full access — all stories including mature content' },
              ].map(row => (
                <div key={row.age} className="flex items-start gap-2.5 text-xs text-gray-400">
                  <span className="flex-shrink-0">{row.icon}</span>
                  <span><span className="text-gray-300 font-medium">{row.age}:</span> {row.desc}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          // ── Success state ────────────────────────────────────────────────────
          <div className="text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-white mb-1">Age Verified</h2>
            <p className={`text-lg font-bold mb-3 ${access?.color}`}>{access?.label}</p>
            <p className="text-sm text-gray-400 mb-6">{access?.desc}</p>
            <p className="text-xs text-gray-600">Redirecting you to the home page…</p>
          </div>
        )}
      </div>

      {/* Skip link — users can always do this later from settings */}
      {!result && (
        <p className="text-center mt-4 text-xs text-gray-600">
          <button
            onClick={() => router.push('/')}
            className="hover:text-gray-400 transition underline"
          >
            Skip for now
          </button>
          {' '}(you&apos;ll have full access until you set your age)
        </p>
      )}
    </div>
  );
}
