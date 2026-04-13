'use client';
/**
 * ReadingRoom.tsx
 *
 * WHAT THIS FILE DOES:
 * Lets logged-in users read a horror story together in real time. One person
 * creates a "room" and shares a 6-character code (e.g. "GHOST7"). Friends enter
 * that code to join and then everyone can see each other's reading progress
 * as a set of progress bars that update live.
 *
 * Real-time updates work in two layers:
 *   1. Pusher (WebSocket) — if configured, pushes updates instantly to all members.
 *   2. Polling fallback — every 5s (or 15s when Pusher is active) the client calls
 *      PATCH /api/reading-rooms/[code] to send its own progress and get the latest
 *      list of all members back.
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * - The "create room / join room by code" pattern is broadly useful for any
 *   shared-session feature (watch parties, quiz rooms, reading groups).
 * - Replace the Pusher channel name "room-${roomCode}" and event "room-update"
 *   with whatever your backend emits.
 * - The scroll-tracking useEffect (which converts scrollY to a 0-100 percentage)
 *   can be dropped into any component that needs to know reading progress.
 *
 * Example usage:
 *   <ReadingRoom storyId={42} isLoggedIn={true} />
 */

import { useState, useEffect, useCallback } from 'react';
import { usePusherChannel } from '@/lib/pusher-client';

type Member = {
  userId: number;
  username: string;
  progress: number; // 0-100 scroll percentage
};

type Props = {
  storyId: number;
  isLoggedIn: boolean;
};

export default function ReadingRoom({ storyId, isLoggedIn }: Props) {
  // UI state: collapsed panel, create/join mode, active room
  const [open,      setOpen]      = useState(false);
  const [mode,      setMode]      = useState<'idle' | 'create' | 'join'>('idle');
  const [joinCode,  setJoinCode]  = useState('');
  const [roomCode,  setRoomCode]  = useState<string | null>(null);
  const [members,   setMembers]   = useState<Member[]>([]);
  const [myProgress, setMyProgress] = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  // ── Create a new room ────────────────────────────────────────────────────

  const createRoom = async () => {
    setLoading(true); setError('');
    const res = await fetch('/api/reading-rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoomCode(data.code); // Switch to active room view
    } else {
      setError('Could not create room.');
    }
    setLoading(false);
  };

  // ── Join an existing room by code ────────────────────────────────────────

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    setLoading(true); setError('');
    const res = await fetch(`/api/reading-rooms/${joinCode.trim().toUpperCase()}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join' }),
    });
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      setRoomCode(joinCode.trim().toUpperCase());
    } else {
      setError('Room not found. Check the code and try again.');
    }
    setLoading(false);
  };

  // ── Poll for member updates every 5 seconds ──────────────────────────────

  const pollRoom = useCallback(async () => {
    if (!roomCode) return;
    const res = await fetch(`/api/reading-rooms/${roomCode}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'progress', progress: myProgress }),
    });
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
    }
  }, [roomCode, myProgress]);

  // Subscribe to Pusher for instant member updates (falls back to polling if not configured)
  const channel = usePusherChannel(roomCode ? `room-${roomCode}` : null);

  useEffect(() => {
    if (!channel) return;
    // When any member's progress changes, update the member list instantly
    const handler = (data: { members: Member[] }) => {
      setMembers(data.members);
    };
    channel.bind('room-update', handler);
    return () => { channel.unbind('room-update', handler); };
  }, [channel]);

  // Poll for updates — reduced to 15s when Pusher is active (safety net),
  // original 5s when Pusher is not configured (primary data source)
  useEffect(() => {
    if (!roomCode) return;
    pollRoom();
    const id = setInterval(pollRoom, channel ? 15_000 : 5_000);
    return () => clearInterval(id);
  }, [roomCode, pollRoom, channel]);

  // ── Track scroll position → my progress ─────────────────────────────────

  useEffect(() => {
    if (!roomCode) return;
    const onScroll = () => {
      const el = document.documentElement;
      const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
      setMyProgress(pct);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [roomCode]);

  // ── Leave room ───────────────────────────────────────────────────────────

  const leaveRoom = () => { setRoomCode(null); setMembers([]); setMode('idle'); };

  // ─────────────────────────────────────────────────────────────────────────

  if (!isLoggedIn) return null;

  return (
    <div className="mt-6">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition"
      >
        <span className="text-lg">👥</span>
        {roomCode ? `Reading Room · ${members.length} member${members.length !== 1 ? 's' : ''}` : 'Reading Room'}
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-[0_4px_20px_rgba(220,38,38,0.1)]">

          {/* ── Active room view ── */}
          {roomCode ? (
            <div className="space-y-4">
              {/* Room code display + copy button */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Room Code</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-white font-mono tracking-widest">{roomCode}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(roomCode)}
                      className="text-xs text-gray-500 hover:text-white border border-gray-700 rounded px-2 py-0.5 transition"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">Share this code with friends to read together</p>
                </div>
                <button onClick={leaveRoom} className="text-xs text-red-500 hover:text-red-400 transition">Leave</button>
              </div>

              {/* Member list with progress bars */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Members</p>
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.userId}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-white font-medium">{m.username}</span>
                        <span className="text-xs text-gray-500">{m.progress}%</span>
                      </div>
                      {/* Reading progress bar */}
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${m.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          ) : mode === 'idle' ? (
            /* ── Idle: create or join buttons ── */
            <div className="flex gap-3">
              <button onClick={() => setMode('create')}
                className="flex-1 py-2.5 bg-red-600/20 border border-red-600/40 text-red-300 hover:bg-red-600/30 text-sm font-semibold rounded-xl transition">
                + Create Room
              </button>
              <button onClick={() => setMode('join')}
                className="flex-1 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500 text-sm font-semibold rounded-xl transition">
                Join Room
              </button>
            </div>

          ) : mode === 'create' ? (
            /* ── Create room confirmation ── */
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Create a new room and share the code with friends. Everyone reads together!</p>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={createRoom} disabled={loading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                  {loading ? 'Creating…' : 'Create Room'}
                </button>
                <button onClick={() => setMode('idle')} className="px-4 border border-gray-700 text-gray-400 rounded-xl text-sm hover:border-gray-500 transition">
                  Cancel
                </button>
              </div>
            </div>

          ) : (
            /* ── Join room by code ── */
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Enter the 6-character room code to join.</p>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ANIME7"
                  maxLength={6}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-red-600/60 transition"
                />
                <button onClick={joinRoom} disabled={loading || joinCode.length < 6}
                  className="px-5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                  {loading ? '…' : 'Join'}
                </button>
              </div>
              <button onClick={() => setMode('idle')} className="text-xs text-gray-500 hover:text-white transition">← Back</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
