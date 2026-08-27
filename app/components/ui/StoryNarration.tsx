'use client';
// app/components/ui/StoryNarration.tsx
//
// "Listen" — reads a story aloud using the browser's built-in Web Speech API
// (window.speechSynthesis). This gives every story narration for free, on the
// client, with no audio files to record, host, or pay for. It complements the
// optional author-uploaded audioUrl: that covers the few stories with real
// recordings, this covers all the rest.
//
// WHY SENTENCE BY SENTENCE
//   The story body is HTML rendered via dangerouslySetInnerHTML, so we cannot
//   easily highlight words inside it as they are spoken. Instead we extract plain
//   text, split it into sentences, and speak them one at a time — chaining each
//   utterance's onend to the next. That lets us show the current sentence in the
//   player and support pause/resume and a sleep timer reliably, without touching
//   the story DOM. Speaking the whole thing as one giant utterance is also
//   unreliable: several browsers cap or silently truncate long utterances.
//
// BROWSER REALITY
//   speechSynthesis support and available voices vary widely, and voices load
//   asynchronously. We feature-detect, populate voices on the voiceschanged
//   event, and hide the control entirely where speech is unavailable rather than
//   showing a dead button.

import { useEffect, useRef, useState, useCallback } from 'react';

// Strip HTML to readable text. Uses the DOM parser so entities and tags are
// handled correctly, then collapses whitespace.
function htmlToText(html: string): string {
  if (typeof document === 'undefined') return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

// Split into sentence-ish chunks. Keeps the terminator, and falls back to the
// whole string if there is no punctuation to split on. Long sentences are further
// broken on commas so no single utterance is enormous.
// Exported for unit testing — the chunking edge cases are the non-trivial part.
export function splitSentences(text: string): string[] {
  const rough = text.match(/[^.!?]+[.!?]+[\])'"`]*|\S[^.!?]*$/g) ?? [text];
  const out: string[] = [];
  for (const s of rough) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 240) {
      out.push(trimmed);
      continue;
    }
    // Break an over-long sentence on commas/semicolons to stay within safe limits.
    let buf = '';
    for (const part of trimmed.split(/(?<=[,;:])\s+/)) {
      if ((buf + ' ' + part).length > 240 && buf) {
        out.push(buf.trim());
        buf = part;
      } else buf = buf ? `${buf} ${part}` : part;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

const SLEEP_OPTIONS = [0, 5, 15, 30, 60]; // minutes; 0 = off

export default function StoryNarration({ content }: { content: string }) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const [sleepMin, setSleepMin] = useState(0);

  const sentencesRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the onend chain against firing after a manual stop (cancel triggers onend).
  const stoppedRef = useRef(false);

  // Feature-detect and load voices (which arrive asynchronously in most browsers).
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length) {
        setVoices(list);
        // Prefer an English voice as the default, else the first available.
        setVoiceURI(
          (prev) =>
            prev || (list.find((v) => v.lang.startsWith('en'))?.voiceURI ?? list[0].voiceURI)
        );
      }
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  // Always cancel any in-flight speech when the component unmounts (navigating
  // away mid-read must not leave a disembodied voice going).
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window)
        window.speechSynthesis.cancel();
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, []);

  const speakFrom = useCallback(
    (index: number) => {
      const sentences = sentencesRef.current;
      if (index >= sentences.length) {
        setStatus('idle');
        setCurrent(0);
        idxRef.current = 0;
        return;
      }

      idxRef.current = index;
      setCurrent(index);

      const utter = new SpeechSynthesisUtterance(sentences[index]);
      const voice = voices.find((v) => v.voiceURI === voiceURI);
      if (voice) utter.voice = voice;
      utter.rate = rate;
      utter.onend = () => {
        if (stoppedRef.current) return; // a manual stop/cancel — do not advance
        speakFrom(index + 1);
      };
      utter.onerror = () => {
        if (!stoppedRef.current) setStatus('idle');
      };
      window.speechSynthesis.speak(utter);
    },
    [voices, voiceURI, rate]
  );

  const play = useCallback(() => {
    if (!supported) return;
    // Prepare sentences lazily on first play.
    if (sentencesRef.current.length === 0)
      sentencesRef.current = splitSentences(htmlToText(content));
    if (sentencesRef.current.length === 0) return;

    stoppedRef.current = false;
    setStatus('playing');
    // Cancel anything queued, then start from the current position.
    window.speechSynthesis.cancel();
    speakFrom(idxRef.current);
  }, [supported, content, speakFrom]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setStatus('playing');
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    setStatus('idle');
    setCurrent(0);
    idxRef.current = 0;
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  // Sleep timer — stop narration after the chosen number of minutes.
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (sleepMin > 0 && status === 'playing') {
      sleepTimerRef.current = setTimeout(() => stop(), sleepMin * 60 * 1000);
    }
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [sleepMin, status, stop]);

  // Changing voice or rate mid-read: restart the current sentence with the new
  // settings so the change is audible immediately rather than next sentence.
  useEffect(() => {
    if (status === 'playing') {
      window.speechSynthesis.cancel();
      speakFrom(idxRef.current);
    }
    // Intentionally only re-runs when voice/rate change, not on status flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceURI, rate]);

  if (!supported) return null; // no dead button where speech is unavailable

  const total = sentencesRef.current.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (status === 'idle') play();
        }}
        aria-label={status === 'idle' ? 'Listen to this story' : 'Narration controls'}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
          status !== 'idle'
            ? 'bg-red-600 border-red-600 text-white'
            : 'text-gray-400 hover:text-white border-gray-700 hover:border-gray-500'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4.03v8.05A4.5 4.5 0 0016.5 12z" />
        </svg>
        {status === 'idle' ? 'Listen' : status === 'paused' ? 'Paused' : 'Listening'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-2 w-72 z-50 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Narration</h3>
              {total > 0 && (
                <span className="text-[11px] text-gray-500">
                  {Math.min(current + 1, total)} / {total}
                </span>
              )}
            </div>

            {/* Transport controls */}
            <div className="flex items-center gap-2">
              {status === 'playing' ? (
                <button
                  type="button"
                  onClick={pause}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition"
                >
                  Pause
                </button>
              ) : status === 'paused' ? (
                <button
                  type="button"
                  onClick={resume}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={play}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Play
                </button>
              )}
              <button
                type="button"
                onClick={stop}
                disabled={status === 'idle'}
                className="px-3 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition disabled:opacity-40"
              >
                Stop
              </button>
            </div>

            {/* Current sentence preview */}
            {status !== 'idle' && total > 0 && (
              <p className="text-xs text-gray-400 italic bg-gray-950 border border-gray-800 rounded-lg p-2 max-h-16 overflow-y-auto">
                {sentencesRef.current[current]}
              </p>
            )}

            {/* Voice */}
            {voices.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">Voice</p>
                <select
                  value={voiceURI}
                  onChange={(e) => setVoiceURI(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200"
                  aria-label="Narration voice"
                >
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rate */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
                Speed — {rate.toFixed(1)}×
              </p>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-red-600"
                aria-label="Narration speed"
              />
            </div>

            {/* Sleep timer */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
                Sleep timer
              </p>
              <div className="grid grid-cols-5 gap-1">
                {SLEEP_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSleepMin(m)}
                    className={`px-1 py-1 text-[11px] rounded-md border transition ${sleepMin === m ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}
                  >
                    {m === 0 ? 'Off' : `${m}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
