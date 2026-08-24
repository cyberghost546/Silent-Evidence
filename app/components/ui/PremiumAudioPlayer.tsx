'use client';
// Audio narration player — only shown to premium subscribers.
// Free users see a locked teaser so they know the audio exists.

import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

type Props = {
  // null for free readers — the server withholds the URL so it never appears in
  // the page payload. Only the locked teaser below is rendered in that case.
  audioUrl: string | null;
  storyTitle: string;
  hasPremium: boolean;
};

export default function PremiumAudioPlayer({ audioUrl, storyTitle, hasPremium }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);   // 0–100
  const [duration, setDuration] = useState(0);
  const [current, setCurrent]   = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrent(el.currentTime);
      setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    };
    const onLoaded = () => setDuration(el.duration);
    const onEnded  = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else         { el.play();  setPlaying(true);  }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  // Locked teaser. The audioUrl check is not redundant with hasPremium — it is
  // the guard that makes the missing URL safe, so a premium flag that somehow
  // arrived true without a URL renders the teaser instead of a broken player.
  if (!hasPremium || !audioUrl) {
    return (
      <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-xl shrink-0">
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Audio Narration Available</p>
          <p className="text-xs text-gray-500 mt-0.5">Premium members can listen to a full narration of this story.</p>
        </div>
        <a
          href="/premium"
          className="shrink-0 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-xl transition"
        >
          Unlock
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-base shrink-0">
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Audio Narration</p>
          <p className="text-xs text-gray-500 truncate">{storyTitle}</p>
        </div>
        <span className="text-xs text-gray-500 shrink-0">{fmt(current)} / {duration ? fmt(duration) : '--:--'}</span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1.5 bg-gray-800 rounded-full cursor-pointer mb-3 overflow-hidden"
        onClick={seek}
      >
        <div
          className="h-full bg-purple-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white text-sm transition"
        >
          {playing
          ? <Pause className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          : <Play className="w-4 h-4" strokeWidth={2} aria-hidden="true" />}
        </button>
        <p className="text-xs text-gray-500">
          {playing ? 'Now playing…' : 'Click to listen'}
        </p>
      </div>
    </div>
  );
}
