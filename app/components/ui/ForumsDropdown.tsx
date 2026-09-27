'use client';
// app/components/ui/ForumsDropdown.tsx
// A nav dropdown that lists all community forum categories.
// The forum list is passed in as a prop (fetched server-side in the layout),
// so this component never makes its own database calls — it's purely a display component.
// Clicking a forum navigates to /forums/[slug]. Closes on outside click.

import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// Each forum needs a name, URL slug, optional emoji icon, and optional description
type Forum = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
};

export default function ForumsDropdown({ forums }: { forums: Forum[] }) {
  // Controls whether the dropdown panel is visible
  const [open, setOpen] = useState(false);

  // We attach this ref to the wrapper div so we can detect clicks outside it
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown when the user clicks anywhere outside the component
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    // Clean up the listener when the component unmounts to avoid memory leaks
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* "Forums" button in the nav bar — chevron rotates when open */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-gray-300 transition text-sm"
      >
        Forums
        {/* Chevron rotates 180° when the dropdown is open */}
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

      {/* Dropdown panel — only rendered when open */}
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-y-auto z-50 max-h-80">
          {/* "All Forums" is always the first option — links to the forum index page */}
          <Link
            href="/forums"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition border-b border-gray-700"
          >
            <div>
              <p className="text-sm font-medium text-white">All Forums</p>
              <p className="text-xs text-gray-500">Browse every category</p>
            </div>
          </Link>

          {/* Individual forum categories — dynamically rendered from the forums prop */}
          {forums.map((forum) => (
            <Link
              key={forum.id}
              href={`/forums/${forum.slug}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition"
            >
              {/* Use the forum's custom icon, or fall back to a pin emoji */}
              <MessagesSquare
                className="w-4 h-4 shrink-0 text-gray-400"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-white">{forum.name}</p>
                {/* Only show description if one has been set in the database */}
                {forum.description && (
                  <p className="text-xs text-gray-500 line-clamp-1">{forum.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
