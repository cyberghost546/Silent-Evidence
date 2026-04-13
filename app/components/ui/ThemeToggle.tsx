'use client';
// app/components/ui/ThemeToggle.tsx
// Icon button that switches the site between dark and light mode.
// Persists the user's preference to localStorage so it survives page reloads.
// Applies the active theme by toggling 'dark' / 'light' classes on <html>,
// which are picked up by Tailwind's darkMode: 'class' configuration.
// No props — this component manages its own state.

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  // true = dark mode active (the site default); false = light mode
  const [dark, setDark] = useState(true);

  // On first render, read the saved preference from localStorage and apply it.
  // Defaults to dark if no preference has been saved yet.
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : true;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }, []);

  // Flips the current theme, saves it, and updates the <html> class list.
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.classList.toggle('light', !next);
  };

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
      aria-label="Toggle theme"
    >
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
