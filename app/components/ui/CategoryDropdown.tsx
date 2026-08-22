'use client';
// CategoryDropdown.tsx
// A dropdown button in the header (or elsewhere) that lists all story categories.
// Clicking a category navigates to its /category/[slug] page.
// Closes when the user clicks outside the component.

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Horror category options — each maps to a /category/[slug] page
const options = [
  'Paranormal',
  'Supernatural',
  'Psychological Horror',
  'Slasher Horror',
  'Body Horror',
  'Cosmic Horror',
  'True Crime',
  'Urban Legends',
  'Tech Horror',
  'Gothic Horror',
  'Survival Horror',
  'Dark Fantasy',
  'Thriller',
  'Mystery',
  'Haunted',
  'Demon & Possession',
  'Creepypasta',
  'True Horror',
  'Monster',
  'Apocalyptic',
  'Occult',
  'Serial Killer',

  // New ones
  'Analog Horror',
  'Analog Technology Horror',
  'Psychological Thriller',
  'Haunted Objects',
  'Demonic Possession',
  'Religious Horror',
  'Cult Horror',
  'Ritual Horror',
  'Sleep Paralysis Horror',
  'Dream / Nightmare Horror',
  'Time Loop Horror',
  'Isolation Horror',
  'Arctic / Ocean Horror',
  'Jungle Horror',
  'Pandemic Horror',
  'Infection Horror',
  'Mutation Horror',
  'AI Horror',
  'Cyber Horror',
  'Internet Horror',
  'Lost Media Horror',
  'Backrooms / Liminal Spaces',
  'VHS / Retro Horror',
  'Experimental Horror',
  'Gore / Extreme Horror',
  'Torture Horror',
  'Revenge Horror',
  'Home Invasion Horror',
  'Stalker Horror',
  'Psychological Breakdown',
  'Doppelgänger Horror',
  'Possessed Technology',
  'Haunted Games',
  'School Horror',
  'Childhood Trauma Horror',

  // Psychological and Mind Horror
  // (Dream Horror, Isolation Horror and Sleep Horror are already covered above
  //  by 'Dream / Nightmare Horror', 'Isolation Horror' and 'Sleep Paralysis Horror')
  'Amnesia Horror',
  'Identity Horror',
  'Madness',
  'Memory Horror',
  'Paranoia',
  'Reality Distortion',
  'Unreliable Narrator',

  // Supernatural Horror
  // ('Possession' is already covered by 'Demonic Possession')
  'Cursed Objects',
  'Demonic Horror',
  'Exorcism',
  'Haunted Dolls',
  'Haunted Houses',
  'Poltergeists',
  'Revenge Spirits',
  'Witch Horror',

  // Creature Horror
  'Alien Horror',
  'Cryptids',
  'Giant Monsters',
  'Insect Horror',
  'Killer Animals',
  'Mutant Creatures',
  'Sea Monsters',
  'Vampire Horror',
  'Werewolf Horror',
  'Zombie Horror',

  // Dark and Violent Horror
  // (Gore Horror, Revenge Horror, Torture Horror, Home Invasion and Cult Horror
  //  are already covered above)
  'Cannibal Horror',
  'Killer Horror',
  'Backwoods Horror',
  'Survival Games',

  // Sci-Fi Horror
  // (AI Horror, Cyber Horror, Time Horror and Virus and Infection are already
  //  covered by 'AI Horror', 'Cyber Horror', 'Time Loop Horror', 'Infection Horror')
  'Biohorror',
  'Genetic Experiments',
  'Space Horror',
  'Virtual Reality Horror',

  // Mystery and Strange Horror
  // ('Mystery Horror' is already covered by 'Mystery')
  'Cursed Media',
  'Missing Persons',
  'Secret Experiments',
  'Unexplained Phenomena',
  'Urban Exploration',
  'Conspiracy Horror',
  'Forbidden Knowledge',

  // Historical and Cultural Horror
  // (Gothic Horror and Religious Horror are already covered above)
  'Japanese Horror',
  'Korean Horror',
  'Victorian Horror',
  'Medieval Horror',
  'Mythological Horror',
  'Ancient Evil',

  // Internet and Modern Horror
  // (Analog Horror and Internet Horror are already covered above)
  'ARG Horror',
  'Dark Web Horror',
  'AI Generated Horror',
  'Social Media Horror',
  'Surveillance Horror',
  'Digital Hauntings'
];

export default function CategoryDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (option: string) => {
    const slug = option.toLowerCase().replace(/ /g, '-');
    router.push(`/category/${slug}`);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1 hover:text-gray-300 transition text-sm"
      >
        Categories
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown list:
          - Dark mode: dark bg, light text
          - Light mode: white bg, black text, blue shadow + blue border via globals.css */}
      {open && (
        <ul
          role="listbox"
          className="absolute top-full mt-2 left-0 w-56 max-h-72 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 light-dropdown"
        >
          {options.map((option) => (
            <li
              key={option}
              role="option"
              onClick={() => handleSelect(option)}
              className="px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white cursor-pointer transition light-dropdown-item"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}