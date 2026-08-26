'use client';
// app/components/ui/SearchBar.tsx
// The search icon and drop-down search panel shown in the site header.
// The backdrop and panel are rendered via a React portal at document.body so they
// are never affected by the sticky header's stacking/containing context.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Portal requires the DOM to be available
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(t) &&
        btnRef.current &&
        !btnRef.current.contains(t)
      ) {
        setOpen(false);
        setFocused(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
    setQuery('');
  };

  const overlay = (
    <>
      {/* Dark backdrop — clicking it closes the panel */}
      <div
        onClick={() => {
          setOpen(false);
          setFocused(false);
        }}
        className={`fixed inset-0 z-9998 transition ${
          open ? 'bg-black/70 pointer-events-auto' : 'bg-transparent pointer-events-none'
        }`}
      />

      {/* Search panel — positioned below the header (57px = h-[57px] header height) */}
      <div
        ref={panelRef}
        className={`fixed inset-x-0 top-14.25 z-9999 transition-all duration-300 ${
          open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="mx-auto max-w-3xl px-4">
          <form
            onSubmit={handleSearch}
            className="rounded-[30px] border border-red-700 bg-gray-950 p-5 shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-3 rounded-[28px] border border-gray-800 bg-gray-900 px-4 py-3 focus-within:border-red-600 transition-all duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 shrink-0 ${focused ? 'text-red-400' : 'text-gray-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search stories, authors, tags..."
                autoComplete="off"
                suppressHydrationWarning
                className="flex-1 min-w-0 bg-transparent text-white placeholder-gray-500 text-base font-light focus:outline-none"
              />

              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                  query ? 'text-gray-300 hover:bg-gray-800' : 'opacity-0 pointer-events-none'
                }`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <button
                type="submit"
                className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
              >
                Search
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="uppercase tracking-[0.3em] text-gray-500">Try</span>
              {['Paranormal', 'Creepy', 'Based on true events', 'Supernatural'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setQuery(tag);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-gray-800 px-3 py-1 transition hover:border-red-600 hover:text-red-300"
                >
                  {tag}
                </button>
              ))}
            </div>
          </form>

          <p className="mt-3 text-center text-xs text-gray-500">
            <kbd className="rounded bg-gray-800 px-2 py-1 text-[10px] font-mono text-gray-400">
              ESC
            </kbd>{' '}
            to close
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Search icon button — always in the header */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Search"
        className={`p-2 rounded-xl transition ${
          open
            ? 'text-white bg-red-600 shadow-lg shadow-red-500/30'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
      </button>

      {/* Portal: renders backdrop + panel directly under <body>, escaping the sticky header */}
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
