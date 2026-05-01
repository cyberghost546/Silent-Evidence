'use client';

import { useState } from 'react';
import { Crown, Search, Edit2, Trash2, Plus, X, Check, AlertTriangle, Clock } from 'lucide-react';

type Sub = {
  id: number;
  status: string;
  plan: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  createdAt: string;
  user: { id: number; username: string; email: string; avatar: string | null };
};

type CountRow = { status: string; _count: { status: number } };

type Props = {
  initialSubs: Sub[];
  initialCounts: CountRow[];
};

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-500/10 border-green-500/30 text-green-400',
  trialing:  'bg-blue-500/10 border-blue-500/30 text-blue-400',
  past_due:  'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  canceled:  'bg-red-500/10 border-red-500/30 text-red-400',
  inactive:  'bg-gray-500/10 border-gray-500/30 text-gray-400',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  active:   <Check className="w-3 h-3" />,
  trialing: <Clock className="w-3 h-3" />,
  past_due: <AlertTriangle className="w-3 h-3" />,
  canceled: <X className="w-3 h-3" />,
  inactive: <X className="w-3 h-3" />,
};

const ALL_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'inactive'];
const ALL_PLANS    = ['monthly', 'yearly'];

export default function PremiumClient({ initialSubs, initialCounts }: Props) {
  const [subs, setSubs]       = useState<Sub[]>(initialSubs);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [editing, setEditing] = useState<Sub | null>(null);
  const [showGrant, setShowGrant] = useState(false);
  const [toast, setToast]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Grant form state
  const [grantUsername, setGrantUsername] = useState('');
  const [grantPlan, setGrantPlan]         = useState('monthly');
  const [grantExpiry, setGrantExpiry]     = useState('');
  const [grantLoading, setGrantLoading]   = useState(false);

  // Edit form state (mirrors the editing sub)
  const [editStatus, setEditStatus]   = useState('');
  const [editPlan, setEditPlan]       = useState('');
  const [editExpiry, setEditExpiry]   = useState('');

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  function openEdit(sub: Sub) {
    setEditing(sub);
    setEditStatus(sub.status);
    setEditPlan(sub.plan);
    setEditExpiry(sub.currentPeriodEnd ? sub.currentPeriodEnd.slice(0, 10) : '');
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch('/api/admin/premium', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subId: editing.id,
        status: editStatus,
        plan: editPlan,
        currentPeriodEnd: editExpiry || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast('error', data.error ?? 'Failed'); return; }
    setSubs(prev => prev.map(s => s.id === data.sub.id ? data.sub : s));
    setEditing(null);
    showToast('success', `Updated @${data.sub.user.username}`);
  }

  async function revoke(sub: Sub) {
    if (!confirm(`Remove premium from @${sub.user.username}? This cannot be undone.`)) return;
    setDeleting(sub.id);
    const res = await fetch('/api/admin/premium', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subId: sub.id }),
    });
    setDeleting(null);
    if (!res.ok) { showToast('error', 'Delete failed'); return; }
    setSubs(prev => prev.filter(s => s.id !== sub.id));
    showToast('success', `Removed premium from @${sub.user.username}`);
  }

  async function grantPremium() {
    setGrantLoading(true);
    // First resolve username → userId
    const search = await fetch(`/api/admin/user-support?q=${encodeURIComponent(grantUsername.trim())}`);
    if (!search.ok) {
      setGrantLoading(false);
      showToast('error', 'User not found');
      return;
    }
    const user = await search.json();

    const res = await fetch('/api/admin/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, plan: grantPlan, currentPeriodEnd: grantExpiry || null }),
    });
    const data = await res.json();
    setGrantLoading(false);
    if (!res.ok) { showToast('error', data.error ?? 'Failed'); return; }

    setSubs(prev => {
      const exists = prev.find(s => s.id === data.sub.id);
      return exists ? prev.map(s => s.id === data.sub.id ? data.sub : s) : [data.sub, ...prev];
    });
    setShowGrant(false);
    setGrantUsername(''); setGrantPlan('monthly'); setGrantExpiry('');
    showToast('success', `Premium granted to @${data.sub.user.username}`);
  }

  // Summary counts
  const countMap: Record<string, number> = {};
  initialCounts.forEach(c => { countMap[c.status] = c._count.status; });
  const totalActive = countMap['active'] ?? 0;

  const displayed = subs.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.user.username.toLowerCase().includes(q) || s.user.email.toLowerCase().includes(q);
    }
    return true;
  });

  const isManual = (sub: Sub) => sub.stripeCustomerId.startsWith('manual_');

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active',   value: countMap['active']   ?? 0, color: 'text-green-400' },
          { label: 'Trialing', value: countMap['trialing'] ?? 0, color: 'text-blue-400'  },
          { label: 'Past Due', value: countMap['past_due'] ?? 0, color: 'text-yellow-400' },
          { label: 'Canceled', value: countMap['canceled'] ?? 0, color: 'text-red-400'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or email…"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...ALL_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === s
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {s === 'all' ? `All (${subs.length})` : `${s.replace('_', ' ')} (${countMap[s] ?? 0})`}
            </button>
          ))}
        </div>

        {/* Grant button */}
        <button
          onClick={() => setShowGrant(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold rounded-xl transition"
        >
          <Plus className="w-4 h-4" /> Grant Premium
        </button>
      </div>

      {/* Grant premium modal */}
      {showGrant && (
        <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" /> Grant Premium Manually
            </h3>
            <button onClick={() => setShowGrant(false)} className="text-gray-500 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Username or Email</label>
              <input
                value={grantUsername}
                onChange={e => setGrantUsername(e.target.value)}
                placeholder="@username"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Plan</label>
              <select
                value={grantPlan}
                onChange={e => setGrantPlan(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
              >
                {ALL_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Expires (optional)</label>
              <input
                type="date"
                value={grantExpiry}
                onChange={e => setGrantExpiry(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowGrant(false)} className="px-4 py-2 text-xs text-gray-500 hover:text-white border border-gray-700 rounded-lg transition">Cancel</button>
            <button
              onClick={grantPremium}
              disabled={grantLoading || !grantUsername.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 rounded-lg transition"
            >
              <Crown className="w-3.5 h-3.5" />
              {grantLoading ? 'Granting…' : 'Grant Premium'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {displayed.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No subscribers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Since</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {displayed.map(sub => (
                  editing?.id === sub.id ? (
                    // ── Inline edit row ──
                    <tr key={sub.id} className="bg-gray-800/50">
                      <td className="px-5 py-3 text-white font-medium">@{sub.user.username}</td>
                      <td className="px-4 py-3">
                        <select
                          value={editPlan}
                          onChange={e => setEditPlan(e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        >
                          {ALL_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        >
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={editExpiry}
                          onChange={e => setEditExpiry(e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="p-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 rounded-lg transition disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-400 rounded-lg transition"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // ── Normal row ──
                    <tr key={sub.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {sub.user.avatar ? (
                            <img src={sub.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-xs font-bold text-yellow-400 uppercase flex-shrink-0">
                              {sub.user.username[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">@{sub.user.username}</p>
                            <p className="text-xs text-gray-500">{sub.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-300 capitalize">{sub.plan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[sub.status] ?? STATUS_STYLES.inactive}`}>
                          {STATUS_ICON[sub.status]}
                          {sub.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isManual(sub) ? (
                          <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">Manual</span>
                        ) : (
                          <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Stripe</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(sub)}
                            className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => revoke(sub)}
                            disabled={deleting === sub.id}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition disabled:opacity-50"
                            title="Revoke premium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
