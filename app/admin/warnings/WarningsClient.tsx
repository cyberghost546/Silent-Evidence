'use client';
import { useState } from 'react';

type Warning = { id: number; reason: string; issuedAt: string; user: { id: number; username: string }; admin: { username: string } };
type BannedUser = { id: number; username: string };
type SuspendedUser = { id: number; username: string; suspendedUntil: string };

export default function WarningsClient({ warnings: initial, bannedUsers: initialBanned, suspendedUsers: initialSuspended }:
  { warnings: Warning[]; bannedUsers: BannedUser[]; suspendedUsers: SuspendedUser[] }) {
  const [warnings] = useState(initial);
  const [bannedUsers, setBannedUsers] = useState(initialBanned);
  const [suspendedUsers, setSuspendedUsers] = useState(initialSuspended);
  const [username, setUsername] = useState('');
  const [action, setAction] = useState<'warn' | 'suspend' | 'ban'>('warn');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const submit = async () => {
    if (!username.trim() || loading) return;
    setLoading(true);
    const res = await fetch('/api/admin/warnings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: undefined, action, reason, suspendDays: days, username: username.trim() }),
    });
    if (res.ok) flash(`Action "${action}" applied to ${username}.`);
    else flash('Error — check the username.');
    setLoading(false); setUsername(''); setReason('');
  };

  const unban = async (userId: number, uname: string) => {
    await fetch('/api/admin/warnings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'unban' }),
    });
    setBannedUsers(b => b.filter(x => x.id !== userId));
    setSuspendedUsers(s => s.filter(x => x.id !== userId));
    flash(`${uname} unbanned.`);
  };

  return (
    <div className="space-y-6">
      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {/* Action form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Issue action</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="exact username"
              className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Action</label>
            <select value={action} onChange={e => setAction(e.target.value as 'warn'|'suspend'|'ban')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
              <option value="warn">Warn</option>
              <option value="suspend">Suspend</option>
              <option value="ban">Permanent Ban</option>
            </select>
          </div>
        </div>
        {action === 'suspend' && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Suspend for (days)</label>
            <input type="number" value={days} onChange={e => setDays(e.target.value)} min="1" max="365"
              className="w-32 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
          </div>
        )}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Reason</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Policy violation, spam, etc."
            className="w-full bg-gray-800 border border-gray-700 focus:border-red-600 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition" />
        </div>
        <button onClick={submit} disabled={loading || !username.trim()}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
          {loading ? 'Applying…' : 'Apply action'}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Banned users */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Banned users ({bannedUsers.length})</h2>
          {bannedUsers.length === 0 ? <p className="text-gray-600 text-sm">No banned users.</p> : (
            <div className="space-y-2">
              {bannedUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{u.username}</span>
                  <button onClick={() => unban(u.id, u.username)} className="text-xs text-green-400 hover:text-green-300 transition">Unban</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suspended users */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Suspended users ({suspendedUsers.length})</h2>
          {suspendedUsers.length === 0 ? <p className="text-gray-600 text-sm">No suspended users.</p> : (
            <div className="space-y-2">
              {suspendedUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">{u.username}</p>
                    <p className="text-xs text-gray-600">Until {new Date(u.suspendedUntil).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => unban(u.id, u.username)} className="text-xs text-green-400 hover:text-green-300 transition">Lift</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Warning history */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Recent warnings</h2>
        {warnings.length === 0 ? <p className="text-gray-600 text-sm">No warnings issued yet.</p> : (
          <div className="space-y-3">
            {warnings.map(w => (
              <div key={w.id} className="border-b border-gray-800 pb-3 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{w.user.username}</span>
                  <span className="text-xs text-gray-500">{new Date(w.issuedAt).toLocaleDateString()} · by {w.admin.username}</span>
                </div>
                <p className="text-xs text-gray-400">{w.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
