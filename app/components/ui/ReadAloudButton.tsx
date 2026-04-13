'use client';
// app/components/ui/ReadAloudButton.tsx
// Uses the browser's Web Speech API (window.speechSynthesis) to read a story aloud.
// Renders a "🔊 Read Aloud" trigger button when idle, and a sticky bottom bar
// with Play/Pause/Stop controls + speed selector + word progress when active.

import { useEffect, useRef, useState } from 'react';

type Props = {
  content: string; // raw HTML content of the story
};

// Speed options available in the selector
const SPEEDS = [
  { label: '0.8×', value: 0.8 },
  { label: '1×',   value: 1   },
  { label: '1.25×', value: 1.25 },
  { label: '1.5×', value: 1.5 },
];

// stripHtml — removes all HTML tags and decodes basic entities,
// returning plain readable text for the speech engine.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')           // remove every tag
    .replace(/&nbsp;/g, ' ')            // decode non-breaking space
    .replace(/&amp;/g, '&')             // decode ampersand
    .replace(/&lt;/g, '<')              // decode less-than
    .replace(/&gt;/g, '>')              // decode greater-than
    .replace(/&quot;/g, '"')            // decode double-quote
    .replace(/&#39;/g, "'")             // decode single-quote
    .replace(/\s+/g, ' ')               // collapse whitespace
    .trim();
}

export default function ReadAloudButton({ content }: Props) {
  // supported — whether the browser has speechSynthesis at all
  const [supported, setSupported]   = useState(false);
  // active — whether the sticky bar is visible (playing or paused)
  const [active,    setActive]      = useState(false);
  // playing — true while speech is running (false when paused or stopped)
  const [playing,   setPlaying]     = useState(false);
  // speed — current playback rate chosen by the user
  const [speed,     setSpeed]       = useState(1);
  // wordIndex — approximate current word being spoken
  const [wordIndex, setWordIndex]   = useState(0);

  // utterRef holds the current SpeechSynthesisUtterance so we can cancel it
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  // wordsRef holds the split word array to derive total word count
  const wordsRef = useRef<string[]>([]);

  // Detect speechSynthesis support on mount (client-side only)
  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  // Cancel speech when the component unmounts (e.g. navigating away)
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Don't render anything if the browser doesn't support the API
  if (!supported) return null;

  // Plain text we'll feed to the speech engine
  const plainText = stripHtml(content);
  const words     = plainText.split(/\s+/).filter(Boolean);
  wordsRef.current = words;
  const totalWords = words.length;

  // start — creates a new utterance and begins speaking from the start
  function start() {
    window.speechSynthesis.cancel(); // cancel any in-progress speech first

    const utter         = new SpeechSynthesisUtterance(plainText);
    utter.rate          = speed;     // apply the selected speed
    utterRef.current    = utter;

    // Track approximate word position as speech progresses
    utter.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === 'word') {
        // charIndex / average word length gives a rough word count
        const approxWord = Math.floor(e.charIndex / 6);
        setWordIndex(Math.min(approxWord, totalWords - 1));
      }
    };

    // When the utterance finishes naturally, reset to idle state
    utter.onend = () => {
      setPlaying(false);
      setActive(false);
      setWordIndex(0);
    };

    window.speechSynthesis.speak(utter);
    setActive(true);
    setPlaying(true);
    setWordIndex(0);
  }

  // pause — pauses the current utterance mid-speech
  function pause() {
    window.speechSynthesis.pause();
    setPlaying(false);
  }

  // resume — resumes a paused utterance
  function resume() {
    window.speechSynthesis.resume();
    setPlaying(true);
  }

  // stop — cancels speech entirely and hides the bar
  function stop() {
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setActive(false);
    setPlaying(false);
    setWordIndex(0);
  }

  // handleSpeedChange — updates the rate and restarts speech at the new speed
  function handleSpeedChange(newSpeed: number) {
    setSpeed(newSpeed);
    if (active) {
      // Restart with the new rate; speech engine doesn't support mid-stream rate changes
      window.speechSynthesis.cancel();
      const utter      = new SpeechSynthesisUtterance(plainText);
      utter.rate       = newSpeed;
      utterRef.current = utter;

      utter.onboundary = (e: SpeechSynthesisEvent) => {
        if (e.name === 'word') {
          setWordIndex(Math.min(Math.floor(e.charIndex / 6), totalWords - 1));
        }
      };
      utter.onend = () => {
        setPlaying(false);
        setActive(false);
        setWordIndex(0);
      };

      window.speechSynthesis.speak(utter);
      setPlaying(true);
    }
  }

  return (
    <>
      {/* ── Trigger button — shown when the player is not active ── */}
      {!active && (
        <button
          onClick={start}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 hover:text-white transition-colors"
          aria-label="Read story aloud"
        >
          {/* Speaker icon */}
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          🔊 Read Aloud
        </button>
      )}

      {/* ── Sticky bottom bar — shown while active (playing or paused) ── */}
      {active && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur border-t border-gray-800 px-4 py-3 flex flex-wrap items-center gap-3 shadow-2xl">

          {/* Play / Pause toggle */}
          <button
            onClick={playing ? pause : resume}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center flex-shrink-0 transition"
            aria-label={playing ? 'Pause' : 'Resume'}
          >
            {playing ? (
              // Pause icon — two vertical bars
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              // Play icon — right-pointing triangle
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Stop button — square icon */}
          <button
            onClick={stop}
            className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center flex-shrink-0 transition"
            aria-label="Stop reading"
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>

          {/* Label */}
          <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
            🔊 Reading aloud
          </span>

          {/* Word progress — "word 142 / 1,234" */}
          <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
            word {(wordIndex + 1).toLocaleString()} / {totalWords.toLocaleString()}
          </span>

          {/* Spacer to push speed selector to the right on wider screens */}
          <div className="flex-1" />

          {/* Speed selector */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-gray-500">Speed</span>
            <select
              value={speed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 cursor-pointer"
              aria-label="Reading speed"
              suppressHydrationWarning
            >
              {SPEEDS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Close / dismiss button */}
          <button
            onClick={stop}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center flex-shrink-0 transition ml-1"
            aria-label="Close read-aloud player"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Bottom padding so the sticky bar doesn't cover page content */}
      {active && <div className="h-20" />}
    </>
  );
}
