'use client';

import { useState, useEffect, useCallback } from 'react';

interface Template { id: number; title: string; cells: string[] }

// Check if the 5×5 grid has a winning line (row, column, or diagonal)
function checkBingo(checks: number[]): boolean {
  const grid = Array(25).fill(false);
  checks.forEach((i) => { grid[i] = true; });

  for (let r = 0; r < 5; r++) {
    if ([0,1,2,3,4].every((c) => grid[r * 5 + c])) return true; // row
    if ([0,1,2,3,4].every((c) => grid[c * 5 + r])) return true; // col
  }
  if ([0,6,12,18,24].every((i) => grid[i])) return true; // diagonal ↘
  if ([4,8,12,16,20].every((i) => grid[i])) return true; // diagonal ↙
  return false;
}

export default function HorrorBingo() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [checks, setChecks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasBingo, setHasBingo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bingo');
      const data = await res.json();
      setTemplate(data.template);
      setChecks(data.checks ?? []);
      setHasBingo(checkBingo(data.checks ?? []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(cellIndex: number) {
    if (!template) return;

    // Optimistic update
    const next = checks.includes(cellIndex)
      ? checks.filter((i) => i !== cellIndex)
      : [...checks, cellIndex];
    setChecks(next);
    setHasBingo(checkBingo(next));

    await fetch('/api/bingo/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id, cellIndex }),
    });
  }

  if (loading) return <div className="text-center py-20 text-gray-600">Loading your bingo card…</div>;

  if (!template) return (
    <div className="text-center py-20 text-gray-600">
      <div className="text-4xl mb-3">🃏</div>
      <p>No active bingo card right now. Check back soon!</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Bingo banner */}
      {hasBingo && (
        <div className="text-center py-4 bg-red-900/40 border border-red-800 rounded-2xl animate-pulse">
          <span className="text-3xl font-black text-red-400 tracking-widest">B I N G O !</span>
          <p className="text-gray-400 text-sm mt-1">You&apos;ve spotted 5 in a row. You are one of us.</p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold text-center mb-4">{template.title}</h2>

        {/* 5×5 grid */}
        <div className="grid grid-cols-5 gap-2">
          {template.cells.map((label, i) => {
            const checked = checks.includes(i);
            const isCenter = i === 12; // free square
            return (
              <button
                key={i}
                onClick={() => !isCenter && toggle(i)}
                disabled={isCenter}
                className={`
                  relative aspect-square rounded-lg p-1 text-center text-xs font-medium leading-tight
                  flex items-center justify-center transition-all duration-150
                  ${isCenter
                    ? 'bg-red-900/60 border border-red-800 text-red-400 cursor-default'
                    : checked
                      ? 'bg-red-800 border border-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                      : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-750 hover:border-gray-600 hover:text-gray-200'
                  }
                `}
              >
                {isCenter ? (
                  <span className="text-lg">💀</span>
                ) : (
                  <>
                    {checked && (
                      <span className="absolute inset-0 flex items-center justify-center text-red-300 text-2xl opacity-30 pointer-events-none">✗</span>
                    )}
                    <span className="relative">{label}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          {checks.filter((i) => i !== 12).length} / 24 squares checked
        </p>
      </div>

      <p className="text-center text-gray-600 text-xs">
        Your progress is saved automatically. Log in to keep it across devices.
      </p>
    </div>
  );
}
