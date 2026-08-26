'use client';
// ============================================================
// FILE: AudioPlayer.tsx
// PURPOSE: Sticky audio player bar that appears fixed at the bottom of the
//          screen when a story has an audioUrl. Lets readers listen while
//          they scroll. Features: play/pause, seek scrubber, volume slider,
//          and a dismiss (×) button to hide the player.
//
// KEY CONCEPT — Controlling <audio> via a ref:
//   React doesn't control the <audio> element through props — instead we use
//   useRef<HTMLAudioElement> to get a direct reference to the DOM node, then
//   call methods like .play(), .pause(), and set properties like .currentTime
//   and .volume directly. This is the standard approach for media elements.
//
// KEY CONCEPT — Listening to audio events:
//   onTimeUpdate fires as the audio plays (we use it to update the scrubber).
//   onLoadedMetadata fires once the browser knows the total duration.
//   onEnded fires when the track finishes playing naturally.
//   These are React's synthetic equivalents of the native HTMLMediaElement events.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Pass audioUrl (a public URL to an audio file) and title (display name).
//   - The scrubber is an <input type="range"> with min=0, max=duration, step=0.1.
//     Setting audioRef.current.currentTime = value on change performs the seek.
//   - The fmtTime helper (seconds → "m:ss") is a useful utility you can copy
//     anywhere you display media duration.
//   - The dismissed state pattern (render null when true) is a clean way to
//     let users permanently hide a sticky widget without unmounting it abruptly.
// ============================================================

import { useEffect, useRef, useState } from 'react';

type Props = {
  audioUrl: string;
  title: string;
};

// Formats seconds into mm:ss — e.g. 125 → "2:05"
function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ audioUrl, title }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0); // current playback time in seconds
  const [duration, setDuration] = useState(0); // total duration in seconds
  const [volume, setVolume] = useState(1); // 0.0 – 1.0
  const [dismissed, setDismissed] = useState(false); // user closed the player

  // Sync audio element volume whenever the slider changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (dismissed) return null;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
  };

  // Jump to a specific position when the user drags the scrubber
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const t = Number(e.target.value);
    el.currentTime = t;
    setCurrent(t);
  };

  return (
    <>
      {/* Hidden <audio> element — we control it via refs */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur border-t border-gray-800 px-4 py-3 flex items-center gap-4 shadow-2xl">
        {/* Play / Pause button */}
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center flex-shrink-0 transition"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            // Pause icon
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            // Play icon
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Story title — truncated */}
        <div className="hidden sm:block flex-shrink-0 max-w-[160px]">
          <p className="text-xs text-gray-400 truncate" title={title}>
            {title}
          </p>
          <p className="text-xs text-gray-600">Audio narration</p>
        </div>

        {/* Time + scrubber */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
            {fmtTime(current)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={current}
            onChange={seek}
            className="flex-1 h-1.5 appearance-none bg-gray-700 rounded-full accent-red-600 cursor-pointer"
            aria-label="Seek"
          />
          <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
            {fmtTime(duration)}
          </span>
        </div>

        {/* Volume slider — hidden on very small screens */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-20 h-1.5 appearance-none bg-gray-700 rounded-full accent-red-600 cursor-pointer"
            aria-label="Volume"
          />
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => {
            audioRef.current?.pause();
            setDismissed(true);
          }}
          className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center flex-shrink-0 transition"
          aria-label="Close player"
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Bottom padding so fixed player doesn't cover page content */}
      <div className="h-20" />
    </>
  );
}
