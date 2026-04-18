'use client';
// app/admin/settings/page.tsx
// Central feature flag panel — toggle site features on/off instantly.

import { useEffect, useState } from 'react';

type Flag = { key: string; label: string; desc: string; danger?: boolean };

const FLAGS: Flag[] = [
  { key: 'registration_open',       label: 'User Registration',        desc: 'Allow new users to create accounts' },
  { key: 'story_submissions_open',  label: 'Story Submissions',         desc: 'Allow authors to submit new stories' },
  { key: 'comments_enabled',        label: 'Comments',                  desc: 'Allow readers to post comments on stories' },
  { key: 'challenge_entries_open',  label: 'Challenge Entries',         desc: 'Allow users to enter writing challenges' },
  { key: 'tipping_enabled',         label: 'Tipping',                   desc: 'Allow readers to tip authors' },
  { key: 'ai_generation_enabled',   label: 'AI Story Generation',       desc: 'Allow admins to generate stories with AI' },
  { key: 'premium_gating',          label: 'Premium Gating',            desc: 'Enforce premium paywall on premium-only stories' },
  { key: 'reading_limit_enabled',   label: 'Free Reading Limit',        desc: 'Enforce the monthly free story reading cap' },
  { key: 'maintenance_mode',        label: 'Maintenance Mode',          desc: 'Show maintenance banner across the site', danger: true },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => setSettings(d.settings ?? {}))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: string) => {
    const newVal = !settings[key];
    setSaving(key);
    setSettings(prev => ({ ...prev, [key]: newVal }));
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: newVal }),
    });
    setSaving(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Site Settings</h1>
      <p className="text-gray-500 text-sm mb-6">Toggle features on or off instantly — changes take effect on the next request.</p>

      <div className="space-y-3">
        {FLAGS.map(flag => {
          const on = settings[flag.key] ?? true;
          return (
            <div key={flag.key} className={`flex items-center justify-between px-5 py-4 bg-gray-900 border rounded-xl transition ${flag.danger && on ? 'border-red-600/40 bg-red-950/10' : 'border-gray-800'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm">{flag.label}</p>
                  {flag.danger && on && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/20 border border-red-600/40 text-red-400">⚠ Active</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{flag.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(flag.key)}
                disabled={loading || saving === flag.key}
                aria-label={`Toggle ${flag.label}`}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${on ? (flag.danger ? 'bg-red-600' : 'bg-green-600') : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
