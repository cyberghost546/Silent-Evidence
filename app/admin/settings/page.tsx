'use client';
// app/admin/settings/page.tsx
//
// WHY 'use client'?
//   This page fetches live settings on mount and responds to toggle clicks, so it
//   needs useState and useEffect — both require a Client Component.
//
// WHAT THIS PAGE DOES:
//   Displays a list of site-wide feature flags as toggle switches. Each flag maps
//   to a row in the SiteSetting database table (key = flag key, value = "true"/"false").
//   Toggling a switch instantly sends a PATCH/POST to the API so the change takes
//   effect on the very next page load — no deploy needed.
//
// HOW THE FLAGS WORK:
//   FLAG keys are string identifiers the rest of the codebase reads from the database
//   (or a cache) to decide whether a feature is active. For example:
//     - `registration_open` → the register page checks this before creating accounts
//     - `maintenance_mode`  → the root layout checks this to show a warning banner
//   The `danger` field marks flags that, when ENABLED, could disrupt normal usage
//   (e.g. maintenance mode). Those get a red border and an "⚠ Active" warning pill.
//
// HOW THE TOGGLE SWITCH WORKS:
//   The outer button is a 48×24px pill (w-12 h-6). Inside it, a 20×20px white
//   circle (the "thumb") is absolutely positioned. CSS translate-x-6 slides it
//   right when on=true; translate-x-0 keeps it left when off. The background
//   colour changes from gray (off) to green (on) or red (danger+on).

import { useEffect, useState } from 'react';

// Flag definition — each entry in the FLAGS array maps one feature to its display
// label and description. `danger` flags get extra visual warnings when enabled.
type Flag = { key: string; label: string; desc: string; danger?: boolean };

// The full list of configurable site flags.
// To add a new feature flag: add a row here + handle `key` in the API route.
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
  // `settings` maps each flag key to its current boolean state.
  // Starts as an empty object; populated by the fetch in the effect below.
  const [settings, setSettings] = useState<Record<string, boolean>>({});

  // True during the initial data fetch — all toggles are disabled while loading
  // so the admin can't interact before the real values arrive.
  const [loading, setLoading] = useState(true);

  // The key of whichever flag is currently being saved (POST in-flight).
  // Null when idle. We track a single key (not a boolean) so we can disable
  // only the specific toggle that was clicked, leaving others interactive.
  const [saving, setSaving] = useState<string | null>(null);

  // ── Fetch current settings on mount ──────────────────────────────────────
  // GET /api/admin/settings returns { settings: { [key]: boolean } }
  // We use .then() chain rather than async/await to comply with the
  // react-hooks/set-state-in-effect linter rule.
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => setSettings(d.settings ?? {}))
      .finally(() => setLoading(false));
  }, []); // empty array — run once when the component mounts

  // ── Toggle a flag ─────────────────────────────────────────────────────────
  // Optimistic update: we flip the local state immediately so the toggle moves
  // at once, then send the POST to persist it. If the POST fails the state is
  // not rolled back (acceptable for an admin-only tool), but `saving` resets
  // so the button becomes clickable again.
  const toggle = async (key: string) => {
    const newVal = !settings[key];
    setSaving(key);
    // Update local state immediately — the toggle responds at once
    setSettings(prev => ({ ...prev, [key]: newVal }));
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: newVal }),
    });
    setSaving(null); // re-enable the toggle regardless of success/failure
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Site Settings</h1>
      <p className="text-gray-500 text-sm mb-6">Toggle features on or off instantly — changes take effect on the next request.</p>

      {/* ── Feature flag rows ─────────────────────────────────────────────
          `space-y-3` adds vertical gap between rows without individual margins. */}
      <div className="space-y-3">
        {FLAGS.map(flag => {
          // Default to true when a flag has no DB row yet — "if not explicitly
          // disabled, the feature is on" is the safer default for most flags.
          const on = settings[flag.key] ?? true;
          return (
            <div
              key={flag.key}
              // Danger flags that are currently ENABLED get a red border/background
              // to make them visually alarming so the admin can't miss them.
              className={`flex items-center justify-between px-5 py-4 bg-gray-900 border rounded-xl transition ${flag.danger && on ? 'border-red-600/40 bg-red-950/10' : 'border-gray-800'}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm">{flag.label}</p>
                  {/* Warning pill — only shown for danger flags when they're active */}
                  {flag.danger && on && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/20 border border-red-600/40 text-red-400">⚠ Active</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{flag.desc}</p>
              </div>

              {/* ── Toggle switch ──────────────────────────────────────────────
                  The outer button is the pill track (w-12 h-6).
                  The inner span is the thumb that slides left ↔ right.
                  translate-x-6 moves the thumb to the right (on state);
                  translate-x-0 keeps it at the left (off state).
                  Green = on, red = on+danger, gray = off. */}
              <button
                type="button"
                onClick={() => toggle(flag.key)}
                // Disabled while data is loading OR while this specific flag is saving
                disabled={loading || saving === flag.key}
                aria-label={`Toggle ${flag.label}`}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${on ? (flag.danger ? 'bg-red-600' : 'bg-green-600') : 'bg-gray-700'}`}
              >
                {/* Thumb: white circle that slides along the pill track */}
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
