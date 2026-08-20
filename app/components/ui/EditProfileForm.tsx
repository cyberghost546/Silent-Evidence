'use client';
// app/components/ui/EditProfileForm.tsx
// The settings form that lets a logged-in user update their profile and password.
//
// This is a client component ('use client') because it manages interactive
// form state (typing, uploading, submitting) which requires React hooks.
// The parent server page fetches the current values and passes them in as props.
//
// The form is split into two separate <form> elements so a user can update
// their profile info and their password independently:
//
//   Form 1 — Profile info: username, bio, avatar upload, website URL
//             → submits to PATCH /api/profile
//
//   Form 2 — Change password: current password + new password (confirmed twice)
//             → submits to PATCH /api/profile/password
//
// Avatar upload flow:
//   The user clicks the avatar image → a hidden <input type="file"> opens →
//   the selected image is sent to POST /api/profile/avatar →
//   the API returns a URL which we store in state and show as a preview.

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type InitialData = {
  username: string;
  bio:      string;
  avatar:   string;
  website:  string;
};

export default function EditProfileForm({ initialData }: { initialData: InitialData }) {
  const router = useRouter();

  const [username, setUsername] = useState(initialData.username);
  const [bio,      setBio]      = useState(initialData.bio);
  const [avatar,   setAvatar]   = useState(initialData.avatar);
  const [website,  setWebsite]  = useState(initialData.website);

  // Separate state for the password change section
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading,       setLoading]       = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [success,       setSuccess]       = useState('');
  const [error,         setError]         = useState('');

  // Hidden file input — triggered by clicking the avatar area
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handle photo upload from device ───────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    // Send the file to the upload API using FormData
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    });

    setUploading(false);

    let data: { url?: string; error?: string } = {};
    try { data = await res.json(); } catch { /* empty body */ }

    if (!res.ok) {
      setError(data.error ?? 'Upload failed.');
      return;
    }

    // Update the avatar field with the returned URL so the preview refreshes
    setAvatar(data.url ?? '');
  };

  // ── Submit profile info ────────────────────────────────────────────────────
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, bio, avatar, website }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }

    setSuccess('Profile updated successfully!');
    // Redirect to the (possibly renamed) profile page
    router.push(`/profile/${data.username}`);
    router.refresh();
  };

  // ── Submit password change ─────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/profile/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }

    setSuccess('Password changed successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Avatar URL to show in the preview — falls back to initials
  const avatarPreview =
    avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=dc2626&color=fff&size=128`;

  return (
    <div className="space-y-8">

      {/* ── Global feedback banners ────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SECTION 1 — Profile info
      ════════════════════════════════════════════════════════════════ */}
      <form
        onSubmit={handleProfileSubmit}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5"
      >
        <h2 className="text-base font-semibold text-white mb-1">Profile Information</h2>

        {/* ── Avatar upload ─────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Avatar</label>
          <div className="flex items-center gap-5">

            {/* Clickable avatar — opens the file picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group flex-shrink-0"
              title="Click to upload a photo"
            >
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-700 group-hover:border-red-500 transition"
              />
              {/* Dark overlay with camera icon shown on hover */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                {uploading ? (
                  <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex-1 space-y-2">
              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition font-medium"
              >
                {uploading ? 'Uploading...' : 'Upload from device'}
              </button>

              <p className="text-xs text-gray-600">JPG, PNG, WebP or GIF · Max 5 MB</p>
            </div>
          </div>
        </div>

        {/* ── Username ──────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
          />
        </div>

        {/* ── Bio ───────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community a little about yourself..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition resize-none"
          />
        </div>

        {/* ── Website ───────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition text-sm"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 — Change password
      ════════════════════════════════════════════════════════════════ */}
      <form
        onSubmit={handlePasswordSubmit}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5"
      >
        <h2 className="text-base font-semibold text-white mb-1">Change Password</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Enter your current password"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Min. 8 characters"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Repeat new password"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition text-sm"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

    </div>
  );
}
