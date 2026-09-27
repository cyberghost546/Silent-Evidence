'use client';
// app/components/ui/BookClubList.tsx
// Lists clubs + create / join forms. Supports premium-only clubs.

import { useEffect, useState } from 'react';
import { Crown, Lock, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type Club = {
  id: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  isPremium: boolean;
  inviteCode: string;
  owner: { username: string; profile: { avatar: string | null } | null };
  _count: { members: number };
  story: {
    title: string;
    slug: string;
    coverImage: string | null;
    author: { username: string };
  } | null;
};

export default function BookClubList({
  userId,
  isPremium,
}: {
  userId: number | null;
  isPremium?: boolean;
}) {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPrivate, setCreatePrivate] = useState(true);
  const [createPremium, setCreatePremium] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/book-club')
      .then((r) => (r.ok ? r.json() : []))
      .then(setClubs)
      .finally(() => setLoading(false));
  }, []);

  const createClub = async () => {
    if (!createName.trim()) return;
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/book-club', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createName,
        description: createDesc,
        isPrivate: createPrivate,
        isPremium: createPremium,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const club = await res.json();
      setClubs((prev) => [club, ...prev]);
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      setCreatePremium(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? 'Failed to create club.');
    }
  };

  const joinClub = async () => {
    if (!joinCode.trim()) return;
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/book-club/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: joinCode }),
    });
    setSaving(false);
    if (res.ok) {
      const { clubId } = await res.json();
      router.push(`/book-club/${clubId}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? 'Invalid invite code.');
    }
  };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-800 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Action buttons */}
      {userId && (
        <div className="flex gap-3 mb-8">
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setShowJoin(false);
              setMsg('');
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold transition"
          >
            + Create Club
          </button>
          <button
            type="button"
            onClick={() => {
              setShowJoin(true);
              setShowCreate(false);
              setMsg('');
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-semibold transition"
          >
            Join with Code
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-8 space-y-4">
          <h3 className="text-white font-bold">Create a New Club</h3>
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Club name"
            maxLength={60}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
          />
          <textarea
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            maxLength={300}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600 resize-none"
          />
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={createPrivate}
              onChange={(e) => setCreatePrivate(e.target.checked)}
              className="rounded"
            />
            Private (invite-only)
          </label>

          {/* Premium-only toggle — only shown to premium subscribers */}
          {isPremium ? (
            <label className="flex items-start gap-3 p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createPremium}
                onChange={(e) => setCreatePremium(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <div>
                <p className="text-sm font-semibold text-yellow-300 flex items-center gap-1">
                  Premium-Only Club
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Only Horror Elite subscribers can join this club.
                </p>
              </div>
            </label>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-700/40 bg-gray-800/30">
              <div>
                <p className="text-sm text-gray-500">Premium-Only Club</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  <Link
                    href="/premium"
                    className="text-yellow-600 hover:text-yellow-500 transition underline"
                  >
                    Upgrade to Premium
                  </Link>{' '}
                  to create members-only discussion rooms.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={createClub}
              disabled={saving || !createName.trim()}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition"
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-5 py-2 text-gray-400 hover:text-white text-sm transition"
            >
              Cancel
            </button>
          </div>
          {msg && <p className="text-red-400 text-xs">{msg}</p>}
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-8 space-y-4">
          <h3 className="text-white font-bold">Join with Invite Code</h3>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter 8-character code"
            maxLength={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600 tracking-widest font-mono uppercase"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={joinClub}
              disabled={saving || joinCode.length < 4}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition"
            >
              {saving ? 'Joining…' : 'Join'}
            </button>
            <button
              type="button"
              onClick={() => setShowJoin(false)}
              className="px-5 py-2 text-gray-400 hover:text-white text-sm transition"
            >
              Cancel
            </button>
          </div>
          {msg && <p className="text-red-400 text-xs">{msg}</p>}
        </div>
      )}

      {/* Club grid */}
      {clubs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="font-medium text-gray-400">No clubs yet.</p>
          {userId ? (
            <p className="text-sm mt-1">Create one and invite your friends.</p>
          ) : (
            <p className="text-sm mt-1">
              <Link href="/login" className="text-red-400 underline">
                Log in
              </Link>{' '}
              to create or join a club.
            </p>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {clubs.map((club) => (
            <Link
              key={club.id}
              href={`/book-club/${club.id}`}
              className={`group rounded-2xl p-5 transition-all border ${
                club.isPremium
                  ? 'bg-yellow-950/20 border-yellow-800/30 hover:border-yellow-600/50'
                  : 'bg-gray-900 border-gray-800 hover:border-red-600/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {club.isPremium ? (
                      <Crown
                        className="w-4 h-4 text-yellow-500"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    ) : club.isPrivate ? (
                      <Lock
                        className="w-4 h-4 text-gray-400"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    ) : (
                      <Globe
                        className="w-4 h-4 text-gray-400"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    )}
                    <h3
                      className={`font-semibold text-sm truncate transition ${club.isPremium ? 'text-yellow-200 group-hover:text-yellow-100' : 'text-white group-hover:text-red-300'}`}
                    >
                      {club.name}
                    </h3>
                    {club.isPremium && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 uppercase tracking-wider shrink-0">
                        Elite
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    by {club.owner.username} · {club._count.members} member
                    {club._count.members !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {club.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{club.description}</p>
              )}

              {club.story ? (
                <div className="flex items-center gap-2 bg-gray-800/60 rounded-xl p-2.5">
                  {club.story.coverImage && (
                    <Image
                      src={club.story.coverImage}
                      alt={club.story.title}
                      width={32}
                      height={32}
                      className="rounded object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">
                      Currently Reading
                    </p>
                    <p className="text-xs text-white truncate">{club.story.title}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic">No story picked yet</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
