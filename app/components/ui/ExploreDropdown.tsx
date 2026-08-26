'use client';
// app/components/ui/ExploreDropdown.tsx
// Dropdown nav item grouping Challenges, Map, and Quiz under "Explore".

import Link from 'next/link';
import {
  Sparkles,
  Newspaper,
  Compass,
  Swords,
  Map,
  Puzzle,
  Download,
  Clapperboard,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const items = [
  { href: '/for-you', label: 'For You', icon: Sparkles, desc: 'Personalised story picks' },
  { href: '/feed', label: 'My Feed', icon: Newspaper, desc: 'Stories from who you follow' },
  { href: '/discover', label: 'Discover', icon: Compass, desc: 'Swipe through horror stories' },
  { href: '/challenges', label: 'Challenges', icon: Swords, desc: 'Writing challenges' },
  { href: '/map', label: 'Horror Map', icon: Map, desc: 'Stories by location' },
  { href: '/quiz', label: 'Trivia Quiz', icon: Puzzle, desc: 'Test your horror knowledge' },
  { href: '/offline-reads', label: 'Offline Reads', icon: Download, desc: 'Your saved stories' },
  { href: '/videos', label: 'Videos', icon: Clapperboard, desc: 'Horror story videos' },
];

export default function ExploreDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-gray-300 transition text-sm"
      >
        Explore
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* light-dropdown = white bg + blue border + blue shadow in light mode */}
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-y-auto z-50 light-dropdown max-h-80">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition light-dropdown-item"
            >
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
