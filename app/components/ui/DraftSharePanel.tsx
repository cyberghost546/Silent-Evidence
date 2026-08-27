'use client';
// app/components/ui/DraftSharePanel.tsx
// Lets the story author generate and manage private draft share links.
// Shown in the story edit page for unpublished stories.
// Generates a shareable URL like: https://site.com/draft/[token]

import { useEffect, useState } from 'react';

interface Token {
  id: number;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

interface Props {
  storyId: number;
}

const BASE_URL =
  typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL ?? '');

export default function DraftSharePanel({ storyId }: Props) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expires, setExpires] = useState<'never' | '7d' | '30d'>('7d');
  const [copied, setCopied] = useState<string | null>(null); // which token was just copied

  // Load existing tokens on mount
  useEffect(() => {
    fetch(`/api/stories/${storyId}/share-token`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTokens)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId]);

  // Generate a new share link
  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch(`/api/stories/${storyId}/share-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expires: expires === 'never' ? null : expires }),
    });
    if (res.ok) {
      const token: Token = await res.json();
      setTokens((prev) => [token, ...prev]);
    }
    setCreating(false);
  };

  // Revoke all tokens
  const handleRevokeAll = async () => {
    await fetch(`/api/stories/${storyId}/share-token`, { method: 'DELETE' });
    setTokens([]);
  };

  // Copy a share link to clipboard
  const handleCopy = async (token: string) => {
    const url = `${BASE_URL}/draft/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(token);
    setTimeout(() => setCopied(null), 2000); // reset after 2s
  };

  return (
    <div className="border border-gray-800 rounded-xl p-5 bg-gray-900 space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm font-bold text-white mb-0.5">Share Draft</p>
        <p className="text-xs text-gray-500">
          Generate a private link so others can read this draft without it being published.
        </p>
      </div>

      {/* Create new link controls */}
      <div className="flex gap-2 items-center">
        {/* Expiry selector */}
        <select
          suppressHydrationWarning
          value={expires}
          onChange={(e) => setExpires(e.target.value as typeof expires)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition"
        >
          <option value="7d">Expires in 7 days</option>
          <option value="30d">Expires in 30 days</option>
          <option value="never">Never expires</option>
        </select>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {creating ? 'Generating…' : '+ New Link'}
        </button>
      </div>

      {/* Existing token list */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-800 rounded-lg" />
          <div className="h-8 bg-gray-800 rounded-lg" />
        </div>
      ) : tokens.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-2">No share links yet.</p>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => {
            const url = `${BASE_URL}/draft/${t.token}`;
            const isExpired = t.expiresAt ? new Date(t.expiresAt) < new Date() : false;

            return (
              <div
                key={t.id}
                className={`flex items-center gap-2 ${isExpired ? 'opacity-40' : ''}`}
              >
                {/* Truncated URL display */}
                <code className="flex-1 text-xs text-gray-400 bg-gray-800 rounded-lg px-3 py-2 truncate">
                  /draft/{t.token}
                </code>

                {/* Expiry label */}
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {isExpired
                    ? 'Expired'
                    : t.expiresAt
                      ? `Exp. ${new Date(t.expiresAt).toLocaleDateString()}`
                      : 'No expiry'}
                </span>

                {/* Copy button */}
                <button
                  onClick={() => handleCopy(t.token)}
                  disabled={isExpired}
                  className="text-xs px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition flex-shrink-0"
                >
                  {copied === t.token ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            );
          })}

          {/* Revoke all */}
          <button
            onClick={handleRevokeAll}
            className="text-xs text-red-500 hover:text-red-400 transition underline mt-1"
          >
            Revoke all links
          </button>
        </div>
      )}
    </div>
  );
}
