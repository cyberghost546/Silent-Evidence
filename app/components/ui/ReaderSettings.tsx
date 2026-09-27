'use client';
// app/components/ui/ReaderSettings.tsx
// A floating "Aa" button on story pages that opens a small panel letting the
// reader adjust font size and line spacing. Settings are saved to localStorage
// so they persist across visits.
//
// The chosen values are applied as CSS custom properties on <body> and picked up
// by the .prose class via a global CSS override (see globals.css for the variables).

import { useState, useEffect, useRef } from 'react';

const FONT_SIZES = [14, 16, 18, 20, 22] as const;
const LINE_HEIGHTS = [1.5, 1.75, 2.0, 2.25] as const;

const LS_FONT = 'se_reader_font';
const LS_LINE = 'se_reader_line';

const DEFAULT_FONT = 18;
const DEFAULT_LINE = 1.75;

export default function ReaderSettings() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const [lineHeight, setLineHeight] = useState(DEFAULT_LINE);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved preferences on mount and apply them immediately
  useEffect(() => {
    const savedFont = parseFloat(localStorage.getItem(LS_FONT) ?? String(DEFAULT_FONT));
    const savedLine = parseFloat(localStorage.getItem(LS_LINE) ?? String(DEFAULT_LINE));
    setFontSize(savedFont);
    setLineHeight(savedLine);
    applyVars(savedFont, savedLine);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function applyVars(font: number, line: number) {
    document.documentElement.style.setProperty('--reader-font-size', `${font}px`);
    document.documentElement.style.setProperty('--reader-line-height', String(line));
  }

  function changeFontSize(size: number) {
    setFontSize(size);
    localStorage.setItem(LS_FONT, String(size));
    applyVars(size, lineHeight);
  }

  function changeLineHeight(lh: number) {
    setLineHeight(lh);
    localStorage.setItem(LS_LINE, String(lh));
    applyVars(fontSize, lh);
  }

  return (
    <div ref={panelRef} className="fixed bottom-20 right-6 z-40">
      {/* Floating "Aa" trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Reader settings"
        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 border border-gray-700 hover:border-red-600/50 text-gray-300 hover:text-white text-sm font-bold shadow-lg transition"
      >
        Aa
      </button>

      {/* Settings panel — slides up from the button */}
      {open && (
        <div className="absolute bottom-12 right-0 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 w-56">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Reader settings
          </p>

          {/* Font size */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Font size</p>
            <div className="flex gap-1.5">
              {FONT_SIZES.map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => changeFontSize(size)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                    fontSize === size
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Line spacing */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Line spacing</p>
            <div className="flex gap-1.5">
              {LINE_HEIGHTS.map((lh) => (
                <button
                  type="button"
                  key={lh}
                  onClick={() => changeLineHeight(lh)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                    lineHeight === lh
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {lh === 1.5 ? 'Tight' : lh === 1.75 ? 'Normal' : lh === 2.0 ? 'Wide' : 'Max'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
