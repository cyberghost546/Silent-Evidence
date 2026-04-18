'use client';
// CategoryDropdown.tsx
// A dropdown button in the header (or elsewhere) that lists all story categories.
// Clicking a category navigates to its /category/[slug] page.
// Closes when the user clicks outside the component.

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Horror category options — each maps to a /category/[slug] page
const options = [
  'Paranormal', 'Supernatural', 'Psychological Horror', 'Slasher Horror',
  'Body Horror', 'Cosmic Horror', 'True Crime', 'Urban Legends',
  'Tech Horror', 'Gothic Horror', 'Survival Horror', 'Dark Fantasy',
  'Thriller', 'Mystery', 'Haunted', 'Demon & Possession',
  'Creepypasta', 'True Horror', 'Monster', 'Apocalyptic',
  'Occult', 'Serial Killer',
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