'use client';
// app/components/ui/ReadingGoalWidget.tsx
// Shows the user's reading goal progress as a circular arc + stats.
// Also lets them set or change their goal inline.
// Used on the profile page sidebar and the dashboard.

import { useEffect, useState } from 'react';

type GoalData = {
  id: number;
  target: number;
  period: string;
  progress: number;
};

// Draws an SVG circular progress arc (0–100%)
function CircleProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const cx = size / 2;

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#374151" strokeWidth={6} />
      {/* Progress arc */}
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={pct >= 100 ? '#16a34a' : '#22c55e'}
        strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

export default function ReadingGoalWidget() {
  const [goal, setGoal]     = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [target, setTarget]   = useState(10);
  const [period, setPeriod]   = useState<'weekly' | 'monthly'>('weekly');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetch('/api/reading-goal')
      .then(r => r.json())
      .then(data => {
        setGoal(data);
        if (data) { setTarget(data.target); setPeriod(data.period); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/reading-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, period }),
    });
    if (res.ok) {
      // Refresh with updated progress
      const updated = await fetch('/api/reading-goal').then(r => r.json());
      setGoal(updated);
    }
    setSaving(false);
    setEditing(false);
  };

  const remove = async () => {
    await fetch('/api/reading-goal', { method: 'DELETE' });
    setGoal(null);
    setEditing(false);
  };

  if (loading) return <div className="h-24 bg-gray-800 rounded-2xl animate-pulse" />;

  // No goal set yet — show prompt to create one
  if (!goal && !editing) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
        <p className="text-2xl mb-2">📚</p>
        <p className="text-sm font-semibold text-white mb-1">Set a Reading Goal</p>
        <p className="text-xs text-gray-500 mb-3">Challenge yourself to read more stories.</p>
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
        >
          Set Goal
        </button>
      </div>
    );
  }

  // Edit / create form
  if (editing) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-sm font-semibold text-white mb-4">
          {goal ? 'Edit Reading Goal' : 'Set Reading Goal'}
        </p>

        {/* Target input */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs text-gray-400 w-20">Read</label>
          <input
            type="number" min={1} max={500} value={target}
            onChange={e => setTarget(Number(e.target.value))}
            className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          <span className="text-xs text-gray-400">stories</span>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs text-gray-400 w-20">Per</label>
          <div className="flex gap-2">
            {(['weekly', 'monthly'] as const).map(p => (
              <button
                key={p} type="button" onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-lg border transition ${
                  period === p ? 'border-red-500 bg-red-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {p === 'weekly' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition">
            Cancel
          </button>
          {goal && (
            <button onClick={remove} className="px-3 py-2 bg-red-950/40 hover:bg-red-950/60 text-red-400 text-xs rounded-lg transition" title="Remove goal">
              🗑
            </button>
          )}
        </div>
      </div>
    );
  }

  // Goal exists — show progress
  if (!goal) return null;
  const pct = Math.round((goal.progress / goal.target) * 100);
  const done = pct >= 100;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-4">
        {/* Circular arc */}
        <div className="relative flex-shrink-0">
          <CircleProgress pct={pct} />
          {/* Percentage in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${done ? 'text-green-400' : 'text-white'}`}>
              {done ? '✓' : `${pct}%`}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {done ? '🎉 Goal Complete!' : 'Reading Goal'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="text-white font-semibold">{goal.progress}</span>
            {' / '}
            <span className="text-white font-semibold">{goal.target}</span>
            {' stories this '}
            {goal.period === 'weekly' ? 'week' : 'month'}
          </p>
          {!done && (
            <p className="text-xs text-gray-600 mt-1">
              {goal.target - goal.progress} more to go
            </p>
          )}
        </div>

        {/* Edit button */}
        <button onClick={() => setEditing(true)} className="text-xs text-gray-600 hover:text-gray-400 transition flex-shrink-0" title="Edit goal">
          ✏️
        </button>
      </div>
    </div>
  );
}
