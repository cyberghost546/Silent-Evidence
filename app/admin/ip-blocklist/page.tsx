'use client';
// app/admin/ip-blocklist/page.tsx
// Manage manually blocked IP addresses and CIDR ranges.

import { useEffect, useState } from 'react';

type Entry = { ip: string; reason: string; addedAt: string };

export default function AdminIpBlocklistPage() {
  const [list, setList]       = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ip, setIp]           = useState('');
  const [reason, setReason]   = useState('');
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/ip-blocklist')
      .then(r => r.json())
      .then(d => setList(d.blocklist ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const add = async () => {
    if (!ip.trim()) return;
    setAdding(true);
    setError('');
    const res = await fetch('/api/admin/ip-blocklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: ip.trim(), reason: reason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to add.'); }
    else { setIp(''); setReason(''); load(); }
    setAdding(false);
  };

  const remove = async (ipAddr: string) => {
    setRemoving(ipAddr);
    await fetch('/api/admin/ip-blocklist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: ipAddr }),
    });
    setRemoving(null);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">IP Blocklist</h1>
      <p className="text-gray-500 text-sm mb-6">Block specific IP addresses or CIDR ranges from submitting content.</p>

      {/* Add form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <p className="text-sm font-semibold text-white mb-4">Add IP / CIDR</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={ip}
            onChange={e => setIp(e.target.value)}
            placeholder="e.g. 192.168.1.1 or 10.0.0.0/8"
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600/50 transition font-mono"
          />
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600/50 transition"
          />
          <button
            type="button"
            onClick={add}
            disabled={adding || !ip.trim()}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Block IP'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{Array.from({length:3}).map((_,i)=><div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse"/>)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-3xl mb-3">🛡️</p>
          <p>No IPs blocked yet.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">IP / CIDR</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Blocked At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-800/60">
              {list.map(e => (
                <tr key={e.ip} className="hover:bg-gray-800/30 transition">
                  <td className="px-4 py-3 font-mono text-red-400 text-xs">{e.ip}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{e.reason || <span className="text-gray-600 italic">No reason</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => remove(e.ip)} disabled={removing === e.ip}
                      className="text-xs px-3 py-1 rounded-lg border border-red-800/40 text-red-500 hover:bg-red-600/10 hover:border-red-600/60 transition disabled:opacity-50">
                      {removing === e.ip ? '…' : 'Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
