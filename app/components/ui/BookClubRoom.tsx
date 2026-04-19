'use client';
// app/components/ui/BookClubRoom.tsx
// The detail view for a single book club — shows members, current story, and invite code.

import { useState } from 'react';
import Link from 'next/link';

type Member = { id: number; joinedAt: string; user: { id: number; username: string; profile: { avatar: string | null } | null } };

type Club = {
  id: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  inviteCode: string;
  owner: { id: number; username: string; profile: { avatar: string | null } | null };
  members: Member[];
  story: {
    id: number; title: string; slug: string; coverImage: string | null; excerpt: string | null;
    author: { username: string };
    _count: { likes: number; comments: number };
  } | null;
};

interface Props {
  club: Club;
  userId: number | null;
  isMember: boolean;
  isOwner: boolean;
}

export default function BookClubRoom({ club, userId, isMember, isOwner }: Props) {
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leftMsg, setLeftMsg] = useState('');

  const copyCode = () => {
    navigator.clipboard.writeText(club.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinPublic = async () => {
    setJoining(true);
    const res = await fetch('/api/book-club/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubId: club.id }),
    });
    if (res.ok) window.location.reload();
    else setJoining(false);
  };

  const leaveClub = async () => {
    if (!confirm('Leave this club?')) return;
    setLeaving(true);
    const res = await fetch('/api/book-club/join', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubId: club.id }),
    });
    if (res.ok) window.location.href = '/book-club';
    else {
      const data = await res.json();
      setLeftMsg(data.error ?? 'Failed to leave.');
      setLeaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{club.isPrivate ? '🔒' : '🌐'}</span>
            <h1 className="text-3xl font-extrabold text-white">{club.name}</h1>
          </div>
          <p className="text-sm text-gray-500">
            Hosted by{' '}
            <Link href={`/user/${club.owner.username}`} className="text-red-400 hover:underline">
              {club.owner.username}
            </Link>
            {' '}· {club.members.length} member{club.members.length !== 1 ? 's' : ''}
          </p>
          {club.description && (
            <p className="text-gray-400 text-sm mt-2 max-w-xl">{club.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {isMember && !isOwner && (
            <button onClick={leaveClub} disabled={leaving}
              className="text-xs text-gray-500 hover:text-red-400 transition px-3 py-1.5 rounded-lg border border-gray-700 hover:border-red-600/40">
              {leaving ? 'Leaving…' : 'Leave Club'}
            </button>
          )}
          {!isMember && !club.isPrivate && userId && (
            <button onClick={joinPublic} disabled={joining}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold transition">
              {joining ? 'Joining…' : 'Join Club'}
            </button>
          )}
          {leftMsg && <p className="text-red-400 text-xs">{leftMsg}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: current story + invite code */}
        <div className="md:col-span-2 space-y-6">
          {/* Current story */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <span>📖</span> Currently Reading
            </h2>
            {club.story ? (
              <Link href={`/story/${club.story.slug}`}
                className="flex gap-4 group hover:opacity-90 transition">
                {club.story.coverImage ? (
                  <img src={club.story.coverImage} alt={club.story.title}
                    className="w-20 h-28 object-cover rounded-xl shrink-0" />
                ) : (
                  <div className="w-20 h-28 bg-gray-800 rounded-xl shrink-0 flex items-center justify-center text-3xl">📕</div>
                )}
                <div>
                  <p className="text-white font-semibold group-hover:text-red-300 transition leading-snug">
                    {club.story.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">by {club.story.author.username}</p>
                  {club.story.excerpt && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-3">{club.story.excerpt}</p>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-gray-500">
                    <span>♥ {club.story._count.likes}</span>
                    <span>💬 {club.story._count.comments}</span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-3">📚</p>
                <p className="text-sm">No story picked yet.</p>
                {isOwner && (
                  <p className="text-xs mt-1 text-gray-600">
                    Go to any story page and set it as this club&apos;s current read.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Discussion link */}
          {club.story && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-sm text-gray-400 mb-3">
                Discuss the story in the comments section — look for the club banner at the top.
              </p>
              <Link href={`/story/${club.story.slug}#comments`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold transition">
                <span>💬</span> Go to Discussion
              </Link>
            </div>
          )}
        </div>

        {/* Right: members + invite code */}
        <div className="space-y-6">
          {/* Invite code (members only) */}
          {isMember && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3 text-sm">Invite Code</h3>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-mono text-xl font-bold tracking-widest text-red-400 bg-gray-800 rounded-xl px-4 py-2 text-center">
                  {club.inviteCode}
                </span>
                <button onClick={copyCode}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-semibold text-white transition">
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">Share this code so friends can join.</p>
            </div>
          )}

          {/* Members */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">
              Members ({club.members.length})
            </h3>
            <div className="space-y-3">
              {club.members.map(m => {
                const avatar = m.user.profile?.avatar ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user.username)}&background=dc2626&color=fff&size=40`;
                const isClubOwner = m.user.id === club.owner.id;
                return (
                  <Link key={m.id} href={`/user/${m.user.username}`}
                    className="flex items-center gap-3 hover:opacity-80 transition">
                    <img src={avatar} alt={m.user.username}
                      className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{m.user.username}</p>
                    </div>
                    {isClubOwner && (
                      <span className="text-xs text-amber-400 font-semibold shrink-0">Host</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
