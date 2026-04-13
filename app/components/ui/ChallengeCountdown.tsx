'use client';
// app/components/ui/ChallengeCountdown.tsx
// Animated countdown widget for writing challenges.
//
// Shows a "flip clock" style countdown to either the start (if upcoming) or
// end (if currently active) of a challenge. When the challenge is over it
// shows a plain "ended" message instead.
//
// Props:
//   challenge — the challenge object fetched server-side, or null if none exists.
//               When null the whole component renders nothing.

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  challenge: {
    id: number;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    active: boolean;
  } | null;
};

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Pads a number to 2 digits, e.g. 5 → "05"
function pad(n: number) {
  return String(n).padStart(2, '0');
}

// Calculates how much time remains until the target date
function getTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

// ─── Animated flip digit card ────────────────────────────────────────────────
// Each time the value changes, it plays a "flip" CSS animation

function FlipCard({ value, label }: { value: number; label: string }) {
  const [displayed, setDisplayed] = useState(pad(value));
  const [flipping, setFlipping]   = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    // Only animate when the value actually changes
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlipping(true);
      // After the animation duration (300ms), update the displayed number
      const t = setTimeout(() => {
        setDisplayed(pad(value));
        setFlipping(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* The card that flips */}
      <div
        className="relative w-20 h-20 md:w-24 md:h-24"
        style={{ perspective: '400px' }}
      >
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-2xl bg-red-600/20 blur-md scale-110" />

        {/* Card face */}
        <div
          className={`
            relative w-full h-full rounded-2xl
            bg-gradient-to-b from-gray-800 to-gray-900
            border border-red-800/40
            shadow-[0_0_20px_rgba(220,38,38,0.15)]
            flex items-center justify-center
            overflow-hidden
            transition-transform duration-300
            ${flipping ? 'scale-y-0' : 'scale-y-100'}
          `}
          style={{ transformOrigin: 'center center' }}
        >
          {/* Horizontal divider line across the middle (classic flip-clock look) */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-black/60 z-10" />

          {/* Top half — slightly darker */}
          <div className="absolute inset-x-0 top-0 bottom-1/2 bg-black/20 rounded-t-2xl" />

          {/* The number */}
          <span className="relative z-20 text-3xl md:text-4xl font-extrabold text-white font-mono tabular-nums tracking-tight">
            {displayed}
          </span>

          {/* Shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none" />
        </div>
      </div>

      {/* Label below the card */}
      <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        {label}
      </span>
    </div>
  );
}

// ─── Floating particle ───────────────────────────────────────────────────────
// A single animated particle rendered as a tiny glowing dot

function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute w-1 h-1 rounded-full bg-red-500/60 animate-float"
      style={style}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ChallengeCountdown({ challenge }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [phase, setPhase]       = useState<'upcoming' | 'active' | 'ended' | null>(null);

  // Tick every second to keep the countdown accurate
  useEffect(() => {
    if (!challenge) return;
    const start = new Date(challenge.startDate);
    const end   = new Date(challenge.endDate);

    const tick = () => {
      const now = Date.now();
      if (now < start.getTime()) {
        setPhase('upcoming');
        setTimeLeft(getTimeLeft(start));
      } else if (now < end.getTime()) {
        setPhase('active');
        setTimeLeft(getTimeLeft(end));
      } else {
        setPhase('ended');
        setTimeLeft(null);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [challenge]);

  if (!challenge) return null;

  // Pre-defined particle positions so they don't shift on re-render
  const particles = [
    { left: '10%',  top: '20%', animationDelay: '0s',    animationDuration: '6s'  },
    { left: '20%',  top: '70%', animationDelay: '1s',    animationDuration: '8s'  },
    { left: '35%',  top: '40%', animationDelay: '2s',    animationDuration: '5s'  },
    { left: '50%',  top: '15%', animationDelay: '0.5s',  animationDuration: '7s'  },
    { left: '65%',  top: '60%', animationDelay: '1.5s',  animationDuration: '9s'  },
    { left: '75%',  top: '30%', animationDelay: '3s',    animationDuration: '6s'  },
    { left: '88%',  top: '75%', animationDelay: '2.5s',  animationDuration: '8s'  },
    { left: '5%',   top: '50%', animationDelay: '4s',    animationDuration: '7s'  },
    { left: '92%',  top: '45%', animationDelay: '0.8s',  animationDuration: '5s'  },
    { left: '45%',  top: '85%', animationDelay: '3.5s',  animationDuration: '9s'  },
  ];

  return (
    <>
      {/*
        Inject the keyframe animations via a <style> tag.
        - float: makes particles drift upward and fade out
        - pulse-ring: expands a glowing ring outward
        - shimmer: sweeps a shine across the title text
      */}
      <style>{`
        @keyframes float {
          0%   { transform: translateY(0)    scale(1);   opacity: 0.6; }
          50%  { transform: translateY(-40px) scale(1.4); opacity: 1;   }
          100% { transform: translateY(-80px) scale(0.8); opacity: 0;   }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0;   }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .animate-float        { animation: float      var(--dur, 6s) var(--delay, 0s) ease-in infinite; }
        .animate-pulse-ring   { animation: pulse-ring 2s ease-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, #f87171 40%, #fff 60%, #f87171 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-red-950/30 to-gray-950 border-y border-red-900/30 py-16">

        {/* ── Background atmosphere ── */}

        {/* Large blurred glow at the top center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-600/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Two corner orbs for depth */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-red-900/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-900/20 blur-3xl rounded-full pointer-events-none" />

        {/* Floating particles */}
        {particles.map((p, i) => (
          <Particle
            key={i}
            style={{
              left: p.left,
              top:  p.top,
              '--dur':   p.animationDuration,
              '--delay': p.animationDelay,
            } as React.CSSProperties}
          />
        ))}

        {/* ── Content ── */}
        <div className="relative max-w-4xl mx-auto px-4 text-center">

          {/* Status badge with pulsing indicator dot */}
          <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-600/40 rounded-full px-5 py-1.5 mb-6 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
            {/* Dot + expanding ring */}
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-pulse-ring absolute inline-flex h-full w-full rounded-full opacity-75 ${phase === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${phase === 'active' ? 'bg-green-400' : 'bg-red-500'}`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-red-300">
              {phase === 'upcoming' ? 'Coming Soon' : phase === 'active' ? '🔴 Live Now' : 'Challenge'}
            </span>
          </div>

          {/* Title with shimmer animation */}
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3 shimmer-text">
            ⚔️ {challenge.title}
          </h2>

          {/* Description */}
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed">
            {challenge.description}
          </p>

          {/* ── Countdown boxes ── */}
          {timeLeft ? (
            <>
              <div className="flex items-end justify-center gap-3 md:gap-6 mb-4">
                <FlipCard value={timeLeft.days}    label="Days"    />

                {/* Colon separator — blinks every second */}
                <span className="text-red-500 text-3xl font-bold mb-8 animate-pulse select-none">:</span>

                <FlipCard value={timeLeft.hours}   label="Hours"   />

                <span className="text-red-500 text-3xl font-bold mb-8 animate-pulse select-none">:</span>

                <FlipCard value={timeLeft.minutes} label="Minutes" />

                <span className="text-red-500 text-3xl font-bold mb-8 animate-pulse select-none">:</span>

                <FlipCard value={timeLeft.seconds} label="Seconds" />
              </div>

              {/* Subtext showing what the countdown is counting toward */}
              <p className="text-xs text-gray-600 mb-8 tracking-widest uppercase">
                {phase === 'upcoming' ? '— Until challenge begins —' : '— Until challenge ends —'}
              </p>
            </>
          ) : (
            <p className="text-gray-500 mb-8 text-lg">This challenge has ended.</p>
          )}

          {/* ── CTA button with glow effect ── */}
          <div className="relative inline-block group">
            {/* Glow behind the button that grows on hover */}
            <div className="absolute inset-0 bg-red-600/40 blur-xl rounded-2xl scale-95 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />

            <Link
              href={`/challenges/${challenge.id}`}
              className="relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-900/40 transition-all duration-300 hover:scale-105 hover:shadow-red-700/50 hover:shadow-xl"
            >
              {/* Shine sweep on hover */}
              <span className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </span>
              {phase === 'active' ? 'Enter the Challenge →' : 'View Challenge →'}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
