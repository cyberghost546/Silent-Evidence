'use client';
// Confetti.tsx
// Purely decorative client component that renders CSS-animated gold and red
// particles to celebrate the user's new Horror Elite subscription.
// Uses no third-party libraries — only inline styles + Tailwind.

import { useEffect, useState } from 'react';

// Each particle has a random position, size, colour, and animation duration
// so they appear scattered and feel organic.
type Particle = {
  id: number;
  x: number; // % from left
  delay: number; // animation-delay in seconds
  size: number; // diameter in px
  color: string; // Tailwind bg-* class
  duration: number; // fall duration in seconds
};

// Colour palette: gold, red, and occasional white for variety
const COLORS = [
  'bg-yellow-400',
  'bg-amber-300',
  'bg-red-500',
  'bg-red-600',
  'bg-white',
  'bg-yellow-300',
];

// Generate N random particles on mount
function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100, // Spread across full viewport width
    delay: Math.random() * 3, // Stagger start times up to 3s
    size: Math.floor(Math.random() * 8) + 4, // 4px–12px
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    duration: Math.random() * 3 + 2, // Fall for 2–5 seconds
  }));
}

export default function Confetti() {
  // Particles are generated only on the client to avoid SSR mismatch
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // 60 particles gives a dense but not overwhelming burst
    setParticles(generateParticles(60));
  }, []);

  return (
    // Fixed overlay that sits above the page but never intercepts pointer events
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-sm opacity-90 ${p.color}`}
          style={{
            // Horizontal position — percentage keeps it viewport-relative
            left: `${p.x}%`,

            // Start above the visible area and fall down past the bottom
            top: '-12px',

            width: `${p.size}px`,
            height: `${p.size}px`,

            // CSS keyframe: translateY moves the particle from -12px to 110vh
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,

            // Slight rotation makes each particle tumble as it falls
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}

      {/* Inject the keyframe animation into the document.
          We use a <style> tag because Tailwind can't generate arbitrary
          keyframe animations at runtime.                                */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-12px) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
