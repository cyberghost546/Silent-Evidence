'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search, User, Mail, KeyRound, ShieldOff, Clock,
  CheckCircle, XCircle, AlertTriangle, Send, RotateCcw,
} from 'lucide-react';

type FoundUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  emailVerified: boolean;
  isVerified: boolean;
  isBanned: boolean;
  suspendedUntil: string | null;
  createdAt: string;
  _count: { stories: number; userWarnings: number };
};

type Toast = { type: 'success' | 'error'; text: string };

export default function UserSupportClient() {
  const [query,     setQuery]     = useState('');
  const [searching, setSearching] = useState(false);
  const [user,      setUser]      = useState<FoundUser | null>(null);
  const [notFound,  setNotFound]  = useState(false);
  const [toast,     setToast]     = useState<Toast | null>(null);
  const [loading,   setLoading]   = useState<string | null>(null); // which action is in-flight

  // Compose message panel
  const [showCompose, setShowCompose] = useState(false);
  const [subject,     setSubject]     = useState('');
  const [message,     setMessage]     = useState('');

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setUser(null);
    setNotFound(false);
    setShowCompose(false);

    const res = await fetch(`/api/admin/user-support?q=${encodeURIComponent(query.trim())}`);
    setSearching(false);
    if (res.status === 404) { setNotFound(true); return; }
    if (!res.ok) { showToast('error', 'Search failed'); return; }
    setUser(await res.json());
  }

  async function action(act: string, extras: Record<string, string> = {}) {
    if (!user) return;
    setLoading(act);

    const res = await fetch('/api/admin/user-support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, userId: user.id, ...extras }),
    });
    const data = await res.json();
    setLoading(null);

    if (!res.ok) { showToast('error', data.error ?? 'Something went wrong'); return; }
    showToast('success', data.message);

    // Optimistically update user card state
    if (act === 'unban')      setUser(u => u ? { ...u, isBanned: false } : u);
    if (act === 'unsuspend')  setUser(u => u ? { ...u, suspendedUntil: null } : u);
    if (act === 'send_advice') { setShowCompose(false); setSubject(''); setMessage(''); }
  }

  const isSuspended = user?.suspendedUntil ? new Date(user.suspendedUntil) > new Date() : false;

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}

      {/* ── Search ── */}
      <form onSubmit={search} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by username or email…"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-5 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* ── Not found ── */}
      {notFound && (
        <p className="text-sm text-gray-500 text-center py-6">No user found matching <strong className="text-white">{query}</strong>.</p>
      )}

      {/* ── User card ── */}
      {user && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-800 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-lg">@{user.username}</span>
                  {user.role === 'ADMIN' && (
                    <span className="text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded">Admin</span>
                  )}
                  {user.isVerified && (
                    <span className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">Verified</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
              </div>
            </div>
            <Link
              href={`/user/${user.username}`}
              target="_blank"
              className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition flex-shrink-0"
            >
              View profile
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-gray-800 border-b border-gray-800">
            {[
              { label: 'Stories',  value: user._count.stories },
              { label: 'Warnings', value: user._count.userWarnings },
              { label: 'Joined',   value: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-3 text-center">
                <p className="text-base font-bold text-white">{value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Status badges */}
          <div className="px-6 py-4 border-b border-gray-800 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              user.emailVerified ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}>
              {user.emailVerified ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              Email {user.emailVerified ? 'Verified' : 'Unverified'}
            </span>

            {user.isBanned && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-red-500/10 border-red-500/30 text-red-400">
                <XCircle className="w-3 h-3" /> Banned
              </span>
            )}

            {isSuspended && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-orange-500/10 border-orange-500/30 text-orange-400">
                <Clock className="w-3 h-3" />
                Suspended until {new Date(user.suspendedUntil!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}

            {!user.isBanned && !isSuspended && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-green-500/10 border-green-500/30 text-green-400">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-6 py-4 flex flex-wrap gap-2">
            <button
              onClick={() => action('reset_password')}
              disabled={!!loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-white rounded-lg transition disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {loading === 'reset_password' ? 'Resetting…' : 'Reset Password'}
            </button>

            <button
              onClick={() => setShowCompose(v => !v)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                showCompose
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-500 text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Send Message
            </button>

            {user.isBanned && (
              <button
                onClick={() => action('unban')}
                disabled={!!loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition disabled:opacity-50"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                {loading === 'unban' ? 'Lifting ban…' : 'Lift Ban'}
              </button>
            )}

            {isSuspended && (
              <button
                onClick={() => action('unsuspend')}
                disabled={!!loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {loading === 'unsuspend' ? 'Lifting…' : 'Lift Suspension'}
              </button>
            )}
          </div>

          {/* ── Compose message panel ── */}
          {showCompose && (
            <div className="px-6 pb-6 border-t border-gray-800 pt-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Compose Email to @{user.username}</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Regarding your account…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Type your advice or instructions here…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-xs text-gray-500 hover:text-white border border-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => action('send_advice', { subject, message })}
                  disabled={!!loading || !subject.trim() || !message.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading === 'send_advice' ? 'Sending…' : 'Send Email'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
