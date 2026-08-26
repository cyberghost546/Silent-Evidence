'use client';
// ============================================================
// FILE: AccountSettings.tsx
// PURPOSE: Renders all account-level settings for the logged-in user.
//
// WHAT IT DOES:
//   1. Private Profile toggle  — hides your profile from non-followers
//   2. Two-Factor Auth toggle  — requires an emailed code on each login
//   3. Change Password         — lets the user update their password
//   4. Delete Account          — permanently removes the account + all stories
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Drop this component anywhere you need a settings panel.
//   - Pass the initial DB values as props so the toggles start in the right state.
//   - Update the fetch() URLs to match your own API routes.
//   - The toggle-switch pattern (pill + sliding dot) is self-contained and
//     can be copy-pasted into any other component that needs an on/off switch.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfToken } from '@/lib/getCsrfToken';

// ── Props ────────────────────────────────────────────────────────────────────
type Props = {
  isPrivate: boolean;          // Whether the user's profile is currently set to private
  twoFactorEnabled?: boolean;  // Whether 2FA is currently enabled for this user (defaults to false)
};

export default function AccountSettings({ isPrivate: initialIsPrivate, twoFactorEnabled: initial2fa = false }: Props) {
  // router is used after account deletion to redirect the user to the homepage
  const router = useRouter();

  // ── Two-Factor Authentication ────────────────────────────────────────────
  // twoFaEnabled mirrors the DB value — toggled optimistically on success
  const [twoFaEnabled, setTwoFaEnabled] = useState(initial2fa);
  // twoFaLoading disables the toggle button while the API request is in flight
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // Sends a PATCH to /api/user/2fa flipping the enabled flag.
  // Only updates local state if the server confirms success.
  // Backup recovery codes. codesToShow drives the one-time display modal — it is
  // set when a fresh set is generated (either here, on enabling 2FA, or via the
  // regenerate button) and is the only moment the plaintext is ever visible.
  const [codesToShow, setCodesToShow] = useState<string[] | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);

  const toggleTwoFa = async () => {
    setTwoFaLoading(true);
    const res = await fetch('/api/user/2fa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': await getCsrfToken() },
      body: JSON.stringify({ enabled: !twoFaEnabled }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setTwoFaEnabled(v => !v); // flip only on success
      // Enabling 2FA returns a first set of recovery codes — show them once.
      if (data.recoveryCodes?.length) setCodesToShow(data.recoveryCodes);
    }
    setTwoFaLoading(false);
  };

  // Regenerates the backup codes. Requires the account password because these
  // are standing credentials — a stolen session alone must not mint a new set.
  const regenerateCodes = async () => {
    const password = prompt('Enter your password to generate new recovery codes. This invalidates your old codes.');
    if (!password) return;
    setRegenLoading(true);
    const res = await fetch('/api/user/recovery-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': await getCsrfToken() },
      body: JSON.stringify({ password }),
    });
    setRegenLoading(false);
    if (res.ok) {
      const data = await res.json();
      setCodesToShow(data.codes);
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? 'Could not generate recovery codes.');
    }
  };

  // ── Change Password ──────────────────────────────────────────────────────
  // pw holds the three input values — current password, new password, confirmation
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading]   = useState(false);
  const [pwError, setPwError]       = useState('');    // validation or server error message
  const [pwSuccess, setPwSuccess]   = useState('');    // success confirmation message
  // showPwFields controls whether the three password inputs are visible
  const [showPwFields, setShowPwFields] = useState(false);

  // Validates the inputs client-side first, then calls /api/user/change-password.
  // On success it clears the fields and collapses the form.
  const changePassword = async () => {
    setPwError('');
    setPwSuccess('');
    // Client-side validation — check length and matching before hitting the server
    if (pw.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pw.next !== pw.confirm) { setPwError('Passwords do not match.'); return; }
    setPwLoading(true);
    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
    });
    const data = await res.json();
    setPwLoading(false);
    if (!res.ok) { setPwError(data.error ?? 'Failed to change password.'); return; }
    // On success: show confirmation, reset all fields, hide the form
    setPwSuccess('Password changed successfully!');
    setPw({ current: '', next: '', confirm: '' });
    setShowPwFields(false);
  };

  // ── Private Profile Toggle ───────────────────────────────────────────────
  // isPrivate mirrors the DB value — toggled optimistically on success
  const [isPrivate, setIsPrivate]   = useState(initialIsPrivate);
  // privLoading disables the toggle switch while the API call is running
  const [privLoading, setPrivLoading] = useState(false);

  // Sends a PATCH to /api/user/privacy flipping the isPrivate flag.
  const togglePrivate = async () => {
    setPrivLoading(true);
    const res = await fetch('/api/user/privacy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrivate: !isPrivate }),
    });
    if (res.ok) setIsPrivate(v => !v); // flip only on success
    setPrivLoading(false);
  };

  // ── Delete Account ───────────────────────────────────────────────────────
  // deleteConfirm holds what the user typed — must equal "DELETE" to unlock the button
  // ── Log out all devices ──────────────────────────────────────────────────
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const logoutAllDevices = async () => {
    setLogoutAllLoading(true);
    const res = await fetch('/api/user/invalidate-sessions', { method: 'POST' });
    if (res.ok) { router.push('/login'); router.refresh(); }
    setLogoutAllLoading(false);
  };

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  // Calls DELETE /api/user/delete-account.
  // On success redirects to "/" and refreshes so the session cookie is cleared.
  // The button is disabled until the user types "DELETE" exactly.
  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { setDeleteError('Type DELETE to confirm.'); return; }
    setDeleteLoading(true);
    const res = await fetch('/api/user/delete-account', {
      method: 'DELETE',
      headers: { 'x-csrf-token': await getCsrfToken() },
    });
    if (res.ok) {
      // Account deleted — redirect to home, refresh to clear the session cookie
      router.push('/');
      router.refresh();
    } else {
      const d = await res.json();
      setDeleteError(d.error ?? 'Failed to delete account.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* ── Private Profile ─────────────────────────────────────────────── */}
      {/* Toggle switch — red when on, gray when off */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Private Profile</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              When on, only your followers can see your stories and profile details.
            </p>
          </div>
          {/* The toggle pill slides right (red) when private is ON, left (gray) when OFF */}
          <button
            onClick={togglePrivate}
            disabled={privLoading}
            aria-label={isPrivate ? 'Disable private profile' : 'Enable private profile'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isPrivate ? 'bg-red-600' : 'bg-gray-700'
            } disabled:opacity-50`}
          >
            {/* The white dot that slides left/right inside the pill */}
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isPrivate ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Two-Factor Authentication ────────────────────────────────────── */}
      {/* Same toggle pattern as Private Profile above */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Two-Factor Authentication</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              When on, you'll need to enter an emailed code on each login.
            </p>
          </div>
          {/* Toggle pill — red when 2FA is ON, gray when OFF */}
          <button
            onClick={toggleTwoFa}
            disabled={twoFaLoading}
            aria-label={twoFaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              twoFaEnabled ? 'bg-red-600' : 'bg-gray-700'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                twoFaEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Backup Recovery Codes ────────────────────────────────────────── */}
      {/* The escape hatch that stops 2FA (or a lost password) from locking you
          out. Generating requires the password; the codes display once. */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Backup Recovery Codes</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Single-use codes to sign in if you lose access to your email. Store them
              somewhere safe and offline. Generating a new set replaces the old one.
            </p>
          </div>
          <button
            type="button"
            onClick={regenerateCodes}
            disabled={regenLoading}
            className="ml-4 shrink-0 px-3 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {regenLoading ? 'Generating…' : 'Generate new codes'}
          </button>
        </div>
      </div>

      {/* One-time codes display. Shown after generation; there is no way to see
          these again, so the user must copy them now. */}
      {codesToShow && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-1">Your recovery codes</h3>
            <p className="text-xs text-amber-400/90 mb-4">
              Save these now — they will not be shown again. Each code works once.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm text-gray-200 bg-gray-950 border border-gray-800 rounded-lg p-4">
              {codesToShow.map((c) => <span key={c}>{c}</span>)}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(codesToShow.join('\n')).catch(() => {}); }}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition"
              >
                Copy all
              </button>
              <button
                type="button"
                onClick={() => setCodesToShow(null)}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                I&apos;ve saved them
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Change Password</h3>
            <p className="text-xs text-gray-500 mt-0.5">Update your account password.</p>
          </div>
          {/* "Change" / "Cancel" button toggles the password fields on/off */}
          <button
            onClick={() => { setShowPwFields(v => !v); setPwError(''); setPwSuccess(''); }}
            className="text-xs text-red-400 hover:text-red-300 transition"
          >
            {showPwFields ? 'Cancel' : 'Change'}
          </button>
        </div>

        {/* Success and error messages sit above the fields */}
        {pwSuccess && <p className="text-xs text-green-400 mb-3">{pwSuccess}</p>}
        {pwError   && <p className="text-xs text-red-400 mb-3">{pwError}</p>}

        {/* Password fields — only shown when the user clicks "Change" */}
        {showPwFields && (
          <div className="space-y-3">
            {/* Renders three inputs from a single array to avoid repetition */}
            {[
              { key: 'current', label: 'Current password', placeholder: 'Your current password' },
              { key: 'next',    label: 'New password',     placeholder: 'Min. 8 characters'     },
              { key: 'confirm', label: 'Confirm new',      placeholder: 'Repeat new password'   },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
                <input
                  type="password"
                  value={pw[key as keyof typeof pw]}
                  // Spread-updates only the changed key, keeping the other two values intact
                  onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  suppressHydrationWarning
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
                />
              </div>
            ))}
            <button
              onClick={changePassword}
              disabled={pwLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition mt-1"
            >
              {pwLoading ? 'Saving…' : 'Update password'}
            </button>
          </div>
        )}
      </div>

      {/* ── Log Out All Devices ─────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Log Out All Devices</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Immediately invalidates every active session, including this one.
              Use this if you think your account has been compromised.
            </p>
          </div>
          <button
            type="button"
            onClick={logoutAllDevices}
            disabled={logoutAllLoading}
            className="ml-4 shrink-0 px-3 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {logoutAllLoading ? 'Logging out…' : 'Log out all'}
          </button>
        </div>
      </div>

      {/* ── Download Your Data ──────────────────────────────────────────── */}
      {/* GDPR Art. 15/20 (and CCPA §1798.100): people can ask for a copy of
          their data in a machine-readable format. The privacy policy already
          promised this; until now only Delete Account existed, which is the
          opposite right. A plain link is enough — the endpoint sets
          Content-Disposition, so the browser downloads rather than navigates. */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Download Your Data</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Get a copy of everything we hold about you — profile, stories, comments,
              reading history, follows and purchases — as a JSON file. Passwords and
              security tokens are excluded.
            </p>
          </div>
          <a
            href="/api/user/export"
            download
            className="ml-4 shrink-0 px-3 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition"
          >
            Download
          </a>
        </div>
      </div>

      {/* ── Delete Account ───────────────────────────────────────────────── */}
      {/* Danger zone — styled with a red tint to signal it's destructive */}
      <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-400 mb-1">Delete Account</h3>
        <p className="text-xs text-gray-500 mb-4">
          Permanently delete your account and all your stories. This cannot be undone.
        </p>
        {deleteError && <p className="text-xs text-red-400 mb-3">{deleteError}</p>}
        <div className="flex gap-2">
          {/* User must type "DELETE" exactly — the Delete button stays disabled until they do */}
          <input
            type="text"
            value={deleteConfirm}
            onChange={e => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
            placeholder='Type "DELETE" to confirm'
            suppressHydrationWarning
            className="flex-1 bg-gray-900 border border-red-900/40 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-800 transition"
          />
          {/* Button is disabled until deleteConfirm === "DELETE" and no request is loading */}
          <button
            onClick={deleteAccount}
            disabled={deleteLoading || deleteConfirm !== 'DELETE'}
            className="px-4 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
          >
            {deleteLoading ? '…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
