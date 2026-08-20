'use client';
// app/components/ui/WritingSprintTimer.tsx
// Active sprint card showing a countdown timer and word count leaderboard.
// Users can join the sprint and submit their word count in real time.
// Polls the API every 15 seconds to keep the leaderboard fresh.

import { useEffect, useRef, useState } from 'react';

interface Participant {
  userId:    number;
  wordCount: number;
  user: { username: string };
}

interface Sprint {
  id:           number;
  title:        string;
  durationMins: number;
  startsAt:     string;  // ISO string
  endsAt:       string;  // ISO string
  participants: Participant[];
}

interface Props {
  sprint:     Sprint;
  currentUserId: number | null;
}

// Format seconds as MM:SS
function formatCountdown(secs: number): string {
  if (secs <= 0) return '00:00';
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function WritingSprintTimer({ sprint, currentUserId }: Props) {
  const endsAt   = new Date(sprint.endsAt).getTime();
  const startsAt = new Date(sprint.startsAt).getTime();

  // Seconds remaining until end (or until start if not yet begun)
  const [secsLeft,  setSecsLeft]  = useState(() => Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
  const [hasStarted, setHasStarted] = useState(() => Date.now() >= startsAt);

  // Leaderboard participants (refreshed via poll)
  const [participants, setParticipants] = useState<Participant[]>(sprint.participants);

  const [joined,    setJoined]    = useState(() =>
    sprint.participants.some(p => p.userId === currentUserId)
  );
  const [wordCount, setWordCount] = useState(() =>
    sprint.participants.find(p => p.userId === currentUserId)?.wordCount ?? 0
  );
  const [inputVal,  setInputVal]  = useState(() =>
    String(sprint.participants.find(p => p.userId === currentUserId)?.wordCount ?? 0)
  );
  const [saving,    setSaving]    = useState(false);

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      setHasStarted(now >= startsAt);
      setSecsLeft(Math.max(0, Math.round((endsAt - now) / 1000)));
    }, 1000);
    return () => clearInterval(tick);
  }, [endsAt, startsAt]);

  // Poll leaderboard every 15 seconds while sprint is active
  useEffect(() => {
    if (secsLeft <= 0) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/sprints');
        if (!res.ok) return;
        const sprints: Sprint[] = await res.json();
        const updated = sprints.find(s => s.id === sprint.id);
        if (updated) setParticipants(updated.participants);
      } catch {
        // ignore poll errors silently
      }
    }, 15_000);
    return () => clearInterval(poll);
  }, [sprint.id, secsLeft]);

  const isEnded = secsLeft <= 0;

  // Join the sprint
  const handleJoin = async () => {
    if (!currentUserId) return;
    const res = await fetch(`/api/sprints/${sprint.id}/join`, { method: 'POST' });
    if (res.ok) setJoined(true);
  };

  // Submit updated word count
  const handleSubmitWords = async () => {
    const count = parseInt(inputVal, 10);
    if (isNaN(count) || count < 0) return;
    setSaving(true);
    const res = await fetch(`/api/sprints/${sprint.id}/join`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ wordCount: count }),
    });
    if (res.ok) {
      setWordCount(count);
      // Update local leaderboard optimistically
      setParticipants(prev =>
        prev.map(p => p.userId === currentUserId ? { ...p, wordCount: count } : p)
      );
    }
    setSaving(false);
  };

  // % progress of the timer (for the progress bar)
  const totalSecs    = sprint.durationMins * 60;
  const elapsedSecs  = Math.max(0, totalSecs - secsLeft);
  const timerPercent = Math.min(100, Math.round((elapsedSecs / totalSecs) * 100));

  return (
    <div className="border border-gray-800 rounded-xl p-5 bg-gray-900 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-0.5">Writing Sprint</p>
          <h3 className="text-base font-bold text-white">{sprint.title}</h3>
          <p className="text-xs text-gray-500">{sprint.durationMins} min sprint · {participants.length} participant{participants.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Countdown */}
        <div className="text-right flex-shrink-0">
          <p className={`text-2xl font-mono font-bold tabular-nums ${isEnded ? 'text-gray-500' : hasStarted ? 'text-red-400' : 'text-yellow-400'}`}>
            {isEnded
              ? 'ENDED'
              : hasStarted
                ? formatCountdown(secsLeft)
                : `Starts in ${formatCountdown(Math.max(0, Math.round((startsAt - Date.now()) / 1000)))}`
            }
          </p>
          {!isEnded && hasStarted && (
            <p className="text-xs text-gray-500 mt-0.5">{timerPercent}% done</p>
          )}
        </div>
      </div>

      {/* Timer progress bar (only shown while active) */}
      {hasStarted && !isEnded && (
        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-red-600 rounded-full transition-all duration-1000"
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      {/* Join / Word Count UI */}
      {currentUserId && !isEnded && hasStarted && (
        <div>
          {!joined ? (
            <button
              onClick={handleJoin}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
            >
              Join Sprint
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                suppressHydrationWarning
                type="number"
                min={0}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Words written…"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
              />
              <button
                onClick={handleSubmitWords}
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
              >
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          )}
          {joined && (
            <p className="text-xs text-gray-500 mt-1.5">Your word count: <span className="text-white font-semibold">{wordCount.toLocaleString()}</span></p>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {participants.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Leaderboard</p>
          {[...participants]
            .sort((a, b) => b.wordCount - a.wordCount)
            .slice(0, 10)
            .map((p, i) => (
              <div key={p.userId} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Rank badge */}
                  <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`truncate ${p.userId === currentUserId ? 'text-red-400 font-semibold' : 'text-gray-300'}`}>
                    {p.user.username}
                    {p.userId === currentUserId && ' (you)'}
                  </span>
                </div>
                <span className="text-white font-mono text-xs flex-shrink-0">{p.wordCount.toLocaleString()} words</span>
              </div>
            ))}
        </div>
      )}

      {/* Ended state */}
      {isEnded && (
        <p className="text-center text-sm text-gray-500 py-2">
          This sprint has ended. {participants.length > 0 && `Winner: ${[...participants].sort((a, b) => b.wordCount - a.wordCount)[0]?.user.username}`}
        </p>
      )}
    </div>
  );
}
