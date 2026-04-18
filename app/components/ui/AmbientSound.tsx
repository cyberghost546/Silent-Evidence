"use client";

// AmbientSound.tsx — A fixed floating button in the bottom-right corner that lets readers
// toggle eerie background audio while reading horror stories.
//
// All audio is generated programmatically via the Web Audio API — no external file URLs needed.
// Three moods are available:
//   "Rain"      — white noise through a low-pass filter, simulating steady rainfall
//   "Heartbeat" — two low-frequency sine-wave thumps with a pause, repeating on a loop
//   "Static"    — white noise through a band-pass filter, simulating old radio static
//
// The chosen mood and playing state are persisted in localStorage under the key 'se-ambient'.

import { useEffect, useRef, useState } from "react";

// Mood names in the order the button cycles through them
type Mood = "Rain" | "Heartbeat" | "Static";
const MOODS: Mood[] = ["Rain", "Heartbeat", "Static"];

// localStorage key for persisting the user's last chosen mood
const LS_KEY = "se-ambient";

// Emoji labels shown in the panel
const MOOD_ICONS: Record<Mood, string> = {
  Rain: "🌧️",
  Heartbeat: "💓",
  Static: "📻",
};

// ─── Web Audio helpers ────────────────────────────────────────────────────────

// Creates a white-noise buffer (1 second of random samples) and returns it.
// The buffer can be looped to produce continuous noise.
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  // One channel, sample rate * 1 second worth of samples
  const bufferSize = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Each sample is a random value between -1 and 1
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Builds and starts the Rain sound graph:
//   WhiteNoiseSource → LowPassFilter(400 Hz) → GainNode(0.18) → destination
// Returns a cleanup function that stops the source node.
function startRain(ctx: AudioContext): () => void {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx);
  source.loop = true; // loop the 1-second noise buffer forever

  // Low-pass filter keeps only the low rumble of rain, cutting harsh high frequencies
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400; // Hz — cut everything above this

  const gain = ctx.createGain();
  gain.gain.value = 0.18; // keep it subtle

  // Wire up: source → filter → gain → speakers
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start();

  // Return a teardown function that the caller uses to stop this sound
  return () => {
    try {
      source.stop();
    } catch {
      // Ignore errors if the source was already stopped
    }
  };
}

// Builds and starts the Static sound graph:
//   WhiteNoiseSource → BandPassFilter(3500 Hz, Q=0.8) → GainNode(0.12) → destination
// Returns a cleanup function.
function startStatic(ctx: AudioContext): () => void {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx);
  source.loop = true;

  // Band-pass filter lets through only a narrow frequency band — sounds like old radio hiss
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 3500; // centre frequency in Hz
  filter.Q.value = 0.8;          // bandwidth: lower Q = wider band

  const gain = ctx.createGain();
  gain.gain.value = 0.12;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start();

  return () => {
    try {
      source.stop();
    } catch { /* ignore */ }
  };
}

// Builds and starts the Heartbeat sound:
//   Two short sine-wave pulses (thump-thump) followed by a silence gap, looping forever.
// Scheduling is done with ctx.currentTime arithmetic rather than setInterval so it stays
// perfectly in sync with the audio clock even when the browser tab is backgrounded.
// Returns a cleanup function that cancels the next scheduled beat.
function startHeartbeat(ctx: AudioContext): () => void {
  let stopped = false;

  // Schedule a single "thump" — a short sine-wave burst that fades quickly
  function scheduleThump(startTime: number, frequency: number) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;

    const env = ctx.createGain();
    // Start at 0, ramp up to 0.4 instantly, then decay over 0.12 s
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

    osc.connect(env);
    env.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.15); // stop slightly after the decay ends
  }

  // Recursively schedule beat pairs so the loop never drifts
  function scheduleBeat(startTime: number) {
    if (stopped) return;

    // First thump (deeper pitch)
    scheduleThump(startTime, 60);
    // Second thump 0.2 s later (slightly higher pitch — the "lub-dub" pattern)
    scheduleThump(startTime + 0.2, 55);

    // Schedule the next pair 1.0 s after the first thump of this pair
    const nextBeat = startTime + 1.0;

    // Use setTimeout to trigger the *next* scheduling call just before nextBeat is due.
    // This keeps the look-ahead small and avoids scheduling too far into the future.
    const delay = Math.max(0, (nextBeat - ctx.currentTime - 0.1) * 1000);
    setTimeout(() => scheduleBeat(nextBeat), delay);
  }

  // Start the first beat slightly in the future to give the graph time to initialise
  scheduleBeat(ctx.currentTime + 0.1);

  return () => {
    stopped = true; // prevents future scheduling rounds from running
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AmbientSound() {
  // Whether audio is currently playing
  const [playing, setPlaying] = useState(false);

  // The currently selected mood — initialised from localStorage if available
  const [mood, setMood] = useState<Mood>(() => {
    if (typeof window === "undefined") return "Rain";
    const saved = localStorage.getItem(LS_KEY) as Mood | null;
    return saved && MOODS.includes(saved) ? saved : "Rain";
  });

  // Whether the floating mood panel is expanded
  const [panelOpen, setPanelOpen] = useState(false);

  // Refs that persist across renders without causing re-renders:
  // - audioCtx: the shared AudioContext (one per component lifetime)
  // - stopCurrent: the cleanup function for the currently playing sound graph
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopCurrentRef = useRef<(() => void) | null>(null);

  // Persist the chosen mood to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LS_KEY, mood);
  }, [mood]);

  // When the mood changes while audio is playing, restart with the new sound
  useEffect(() => {
    if (playing) {
      stopAndRestart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  // Cleanup on component unmount: stop audio and close the AudioContext
  useEffect(() => {
    return () => {
      stopAudio();
      audioCtxRef.current?.close();
    };
  }, []);

  // Lazily creates (or reuses) the shared AudioContext.
  // AudioContext must be created after a user gesture on most browsers.
  function getOrCreateCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    // Resume in case it was suspended (browsers auto-suspend on inactivity)
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  // Calls the currently active stop-cleanup function and clears the ref
  function stopAudio() {
    if (stopCurrentRef.current) {
      stopCurrentRef.current();
      stopCurrentRef.current = null;
    }
  }

  // Stops any running audio then starts the currently selected mood
  function stopAndRestart() {
    stopAudio();
    const ctx = getOrCreateCtx();

    // Pick the correct builder based on the mood
    let stopFn: () => void;
    if (mood === "Rain") {
      stopFn = startRain(ctx);
    } else if (mood === "Heartbeat") {
      stopFn = startHeartbeat(ctx);
    } else {
      stopFn = startStatic(ctx);
    }

    stopCurrentRef.current = stopFn;
  }

  // Toggle the audio on/off when the main button is pressed
  function handleToggle() {
    if (playing) {
      stopAudio();
      setPlaying(false);
    } else {
      stopAndRestart();
      setPlaying(true);
    }
  }

  // Cycle to the next mood in the MOODS array
  function handleCycleMood() {
    const idx = MOODS.indexOf(mood);
    const next = MOODS[(idx + 1) % MOODS.length];
    setMood(next);
  }

  return (
    // Fixed container in the bottom-right corner, above most other content (z-50)
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

      {/* ── Expanded mood panel ── */}
      {panelOpen && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-2xl flex flex-col gap-2 min-w-[160px]">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">
            Ambient Mood
          </p>

          {/* One button per available mood */}
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMood(m);
                // If audio isn't playing yet, start it when a mood is picked from the panel
                if (!playing) {
                  stopAndRestart();
                  setPlaying(true);
                }
              }}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded transition-colors ${
                mood === m
                  ? "bg-red-900 text-red-200 font-semibold"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <span>{MOOD_ICONS[m]}</span>
              <span>{m}</span>
              {/* Active indicator dot */}
              {mood === m && playing && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          ))}

          {/* Divider and cycle shortcut */}
          <hr className="border-zinc-700 my-1" />
          <button
            onClick={handleCycleMood}
            className="text-xs text-zinc-500 hover:text-zinc-300 text-center transition-colors"
          >
            Next mood →
          </button>
        </div>
      )}

      {/* ── Row: panel toggle + main play/stop button ── */}
      <div className="flex items-center gap-2">

        {/* Small label button that opens/closes the mood panel */}
        <button
          onClick={() => setPanelOpen((prev) => !prev)}
          title="Choose ambient mood"
          className="bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs px-2 py-1.5 rounded-lg transition-colors shadow-lg"
        >
          {MOOD_ICONS[mood]} {mood}
        </button>

        {/* Main toggle button — shows 🔇 when silent, 🔊 when playing */}
        <button
          onClick={handleToggle}
          title={playing ? "Stop ambient sound" : "Play ambient sound"}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-2xl border transition-all duration-300 ${
            playing
              ? "bg-red-900 border-red-700 text-white hover:bg-red-800"
              : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          {playing ? "🔊" : "🔇"}
        </button>
      </div>
    </div>
  );
}
