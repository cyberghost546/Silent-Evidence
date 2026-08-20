'use client';
// app/onboarding/page.tsx
// 3-step onboarding wizard shown once after a new user registers.
// Step 1: Set bio and avatar URL
// Step 2: Pick favorite horror moods
// Step 3: Explore links (write a story, browse categories, find authors)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PenLine, Library, Flame, Users, Circle } from 'lucide-react';
import { moodIcon } from '@/lib/moodIcons';

// Available horror moods matching the Mood enum in schema.prisma
const MOODS = [
  { value: 'EPIC',          label: 'Epic',          icon: moodIcon('EPIC') },
  { value: 'HEARTWARMING',  label: 'Heartwarming',  icon: moodIcon('HEARTWARMING') },
  { value: 'MYSTERIOUS',    label: 'Mysterious',    icon: moodIcon('MYSTERIOUS') },
  { value: 'ACTION',        label: 'Action',        icon: moodIcon('ACTION') },
  { value: 'ROMANTIC',      label: 'Romantic',      icon: moodIcon('ROMANTIC') },
  { value: 'COMEDIC',       label: 'Comedic',       icon: moodIcon('COMEDIC') },
  { value: 'DRAMATIC',      label: 'Dramatic',      icon: moodIcon('DRAMATIC') },
  { value: 'DARK',          label: 'Dark',          icon: moodIcon('DARK') },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);       // Step 1 = age, 2 = profile, 3 = moods, 4 = explore
  const [dob,    setDob]    = useState('');  // date of birth input
  const [bio, setBio]     = useState('');
  const [avatar, setAvatar] = useState('');
  const [moods, setMoods]   = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [ageError, setAgeError] = useState('');

  // Save date of birth then advance to next step
  const handleAgeNext = async () => {
    if (!dob) { setAgeError('Please enter your date of birth to continue.'); return; }
    setAgeError('');
    setSaving(true);
    await fetch('/api/user/age', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dateOfBirth: dob }),
    });
    setSaving(false);
    setStep(2);
  };

  // Toggle a mood on/off in the selection array
  const toggleMood = (val: string) => {
    setMoods((prev) =>
      prev.includes(val) ? prev.filter((m) => m !== val) : [...prev, val]
    );
  };

  // Called on the final step — save data and redirect to home
  const finish = async () => {
    setSaving(true);
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio, avatar, moods }),
    });
    setSaving(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Progress bar — 4 steps */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-red-600' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Age verification ──────────────────────── */}
        {step === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="mb-6">
              <p className="text-xs text-red-500 font-semibold uppercase tracking-widest mb-1">Step 1 of 4</p>
              <h1 className="text-2xl font-bold text-white">How old are you?</h1>
              <p className="text-gray-400 text-sm mt-1">
                We use your age to make sure you only see content that&apos;s right for you.
                This is kept private and never shared.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Date of Birth</label>
              <input
                suppressHydrationWarning
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
              />
            </div>

            {/* Age group preview */}
            <div className="grid grid-cols-3 gap-2 mb-5 text-center text-xs">
              {[
                { icon: Circle, tone: 'text-blue-400',   age: 'Under 13', access: 'General only' },
                { icon: Circle, tone: 'text-yellow-400', age: '13 – 17',  access: 'Teen + General' },
                { icon: Circle, tone: 'text-green-400',  age: '18+',      access: 'Full access' },
              ].map(r => (
                <div key={r.age} className="bg-gray-800 rounded-lg p-2">
                  <div className="flex justify-center mb-1">
                    <r.icon className={`w-4 h-4 ${r.tone}`} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="font-semibold text-gray-300">{r.age}</div>
                  <div className="text-gray-500 text-[10px] mt-0.5">{r.access}</div>
                </div>
              ))}
            </div>

            {ageError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
                {ageError}
              </p>
            )}

            <button
              onClick={handleAgeNext}
              disabled={saving}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
            >
              {saving ? 'Saving…' : 'Next →'}
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full mt-2 py-2 text-xs text-gray-600 hover:text-gray-400 transition"
            >
              Skip for now (you can set this in Settings later)
            </button>
          </div>
        )}

        {/* ── Step 2: Profile setup ─────────────────────────── */}
        {step === 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="mb-6">
              <p className="text-xs text-red-500 font-semibold uppercase tracking-widest mb-1">Step 2 of 4</p>
              <h1 className="text-2xl font-bold text-white">Welcome to Silent Evidence</h1>
              <p className="text-gray-400 text-sm mt-1">Let's set up your profile so other readers can find you.</p>
            </div>

            {/* Bio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Bio (optional)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community a little about yourself…"
                rows={3}
                maxLength={200}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-600 transition"
              />
              <p className="text-xs text-gray-600 mt-1 text-right">{bio.length}/200</p>
            </div>

            {/* Avatar URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Avatar URL (optional)</label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://…"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition"
              />
              {/* Preview the avatar if a valid URL is entered */}
              {avatar && (
                <img
                  src={avatar}
                  alt="preview"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                  className="w-16 h-16 rounded-full object-cover mt-3 ring-2 ring-red-600"
                />
              )}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 3: Horror mood preferences ──────────────── */}
        {step === 3 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="mb-6">
              <p className="text-xs text-red-500 font-semibold uppercase tracking-widest mb-1">Step 3 of 4</p>
              <h1 className="text-2xl font-bold text-white">What scares you?</h1>
              <p className="text-gray-400 text-sm mt-1">
                Pick your favorite horror types so we can recommend stories you'll love.
              </p>
            </div>

            {/* Mood grid */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {MOODS.map((mood) => {
                const selected = moods.includes(mood.value);
                return (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => toggleMood(mood.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                      selected
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    <mood.icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                    {mood.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Explore ──────────────────────────────── */}
        {step === 4 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <div className="mb-6">
              <p className="text-xs text-red-500 font-semibold uppercase tracking-widest mb-1">Step 4 of 4</p>
              <h1 className="text-2xl font-bold text-white">You're all set!</h1>
              <p className="text-gray-400 text-sm mt-1">Where would you like to go first?</p>
            </div>

            {/* Quick-start options */}
            <div className="grid grid-cols-1 gap-3 mb-8">
              {[
                { href: '/write',      icon: PenLine, label: 'Write my first story',   desc: 'Share something that haunts you' },
                { href: '/',           icon: Library, label: 'Browse stories',         desc: 'Read what others have written' },
                { href: '/trending',   icon: Flame,   label: "See what's trending",    desc: 'Discover the most popular stories' },
                { href: '/explore',    icon: Users,   label: 'Find authors to follow', desc: 'Build your reading feed' },
              ].map(({ href, icon: Icon, label, desc }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={finish}
                  className="flex items-center gap-4 px-4 py-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-red-600/40 rounded-xl transition text-left"
                >
                  <Icon className="w-6 h-6 shrink-0 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Complete button — saves and goes to home */}
            <button
              onClick={finish}
              disabled={saving}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-xl transition"
            >
              {saving ? 'Saving…' : 'Go to Silent Evidence →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
