'use client';
// app/components/ui/SearchBar.tsx
// The search icon and drop-down search panel shown in the site header.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [focused, setFocused] = useState(false);

  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(t) &&
        btnRef.current   && !btnRef.current.contains(t)
      ) { setOpen(false); setFocused(false); }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setFocused(false); }
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

  return (
    <>
      {/* ── Trigger icon ───────────────────────────────── */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Search"
        className={`relative p-2 rounded-xl transition-all duration-300 flex-shrink-0 group overflow-hidden ${
          open
            ? 'text-white bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.7)]'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      </button>

      {/* ── Cinematic backdrop ─────────────────────────── */}
      <div
        onClick={() => { setOpen(false); setFocused(false); }}
        className={`fixed inset-0 z-30 transition-all duration-500 ${
          open
            ? 'bg-black/70 backdrop-blur-md pointer-events-auto'
            : 'bg-transparent backdrop-blur-none pointer-events-none'
        }`}
      />

      {/* ── Drop-down panel ────────────────────────────── */}
      <div
        ref={panelRef}
        className={`fixed left-0 right-0 top-[57px] z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'
        }`}
      >
        <div className="h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />

        <div className="relative bg-gray-950/95 backdrop-blur-xl border-b border-gray-800 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(220,38,38,0.12)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)' }}
          />

          <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto px-6 pt-4 pb-2 flex flex-col gap-3">
            <div className={`flex items-center gap-4 rounded-2xl px-5 py-3 border transition-all duration-300 ${
              focused
                ? 'bg-gray-900 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3),inset_0_0_20px_rgba(220,38,38,0.05)]'
                : 'bg-gray-900/60 border-gray-700 shadow-inner'
            }`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-6 h-6 flex-shrink-0 transition-all duration-300 ${focused ? 'text-red-500 scale-110' : 'text-gray-600'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search stories, authors, tags..."
                autoComplete="off"
                suppressHydrationWarning
                className="flex-1 bg-transparent text-white placeholder-gray-600 text-base font-light tracking-wide focus:outline-none"
              />

              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 transition-all duration-200 flex-shrink-0 ${
                  query ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <span className={`w-px h-6 bg-gray-700 flex-shrink-0 transition-opacity duration-300 ${focused ? 'opacity-100' : 'opacity-40'}`} />

              <button
                type="submit"
                className="relative px-5 py-2 rounded-xl text-sm font-bold text-white overflow-hidden group/btn flex-shrink-0
                  bg-gradient-to-r from-red-700 to-red-500
                  hover:from-red-600 hover:to-red-400
                  active:scale-95
                  shadow-[0_0_16px_rgba(220,38,38,0.4)]
                  hover:shadow-[0_0_28px_rgba(220,38,38,0.7)]
                  transition-all duration-200"
              >
                <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                Search
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap pb-1">
              <span className="text-xs text-gray-600 mr-1">Try:</span>
              {['Paranormal', 'Creepy', 'Based on true events', 'Supernatural'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { setQuery(tag); inputRef.current?.focus(); }}
                  className="px-3 py-1 text-xs rounded-full border border-gray-700 text-gray-500 hover:border-red-600/60 hover:text-red-400 hover:bg-red-600/10 transition-all duration-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          </form>

          <p className="text-center text-xs text-gray-700 pb-2 tracking-wider">
            <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-600 font-mono text-[10px]">ESC</kbd>
            {' '}to close
          </p>
        </div>

        <div className="h-4 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      </div>
    </>
  );
}
