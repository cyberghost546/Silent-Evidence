'use client';
// app/components/ui/GhostMode.tsx
// Ghost Mode lets readers browse stories anonymously — their reading activity
// won't be recorded while it's on. The setting is saved in localStorage so it
// persists across page loads without needing a database call.
//
// This file exports three things:
//   1. GhostContext / GhostModeProvider — wraps the app so any child component
//      can read the current ghost state without prop-drilling.
//   2. useGhostMode() — a convenience hook that returns true/false.
//   3. GhostModeToggle — the visible button the user clicks in the UI.

import { useState, useEffect, createContext, useContext } from 'react';

// React context that holds the current ghost mode value (true = anonymous).
// Defaults to false (tracking on) until the provider reads localStorage.
const GhostContext = createContext(false);

// useGhostMode — call this in any child component to find out whether ghost
// mode is currently active. Returns true if the user is browsing anonymously.
export const useGhostMode = () => useContext(GhostContext);

// GhostModeProvider wraps the part of the app that needs to react to ghost mode.
// It reads the value from localStorage once on mount (client-side only) and
// then makes it available to all children via context.
export function GhostModeProvider({ children }: { children: React.ReactNode }) {
  // Start with false (not anonymous) — localStorage is only accessible in the browser,
  // so we can't read it until after the first render.
  const [ghost, setGhost] = useState(false);
  useEffect(() => {
    // Sync with whatever the user last saved
    setGhost(localStorage.getItem('ghostMode') === 'true');
  }, []);
  return <GhostContext.Provider value={ghost}>{children}</GhostContext.Provider>;
}

// GhostModeToggle is the button that appears in the header or sidebar.
// It manages its own local state independently from the provider above —
// both read from the same localStorage key so they stay in sync.
export default function GhostModeToggle() {
  // Local copy of the ghost state for this button component
  const [ghost, setGhost] = useState(false);

  useEffect(() => {
    // Read the saved preference once the component mounts in the browser
    setGhost(localStorage.getItem('ghostMode') === 'true');
  }, []);

  const toggle = () => {
    const next = !ghost;
    setGhost(next);
    // Persist the new value so it survives page refreshes
    localStorage.setItem('ghostMode', String(next));
    // Fire a custom event so ReadingTracker and any other listeners
    // can immediately stop (or resume) tracking without a page reload
    window.dispatchEvent(new Event('ghostModeChange'));
  };

  return (
    // The button changes colour when ghost mode is active (purple tint vs neutral grey)
    // so users can clearly see their current state at a glance.
    <button
      onClick={toggle}
      title={ghost ? 'Ghost Mode ON — reading anonymously' : 'Ghost Mode OFF — click to read anonymously'}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
        ghost
          ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'  // active: purple
          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600' // inactive: grey
      }`}
    >
      <span className="text-base leading-none">👻</span>
      {ghost ? 'Ghost Mode ON' : 'Ghost Mode'}
    </button>
  );
}
