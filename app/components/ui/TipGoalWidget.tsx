'use client';
// app/components/ui/TipGoalWidget.tsx
// Displays an author's tip goal with a progress bar.
// Shows: goal title, description, $ raised vs $ goal, and % progress.
// Authors can set a goal like "$50 = I'll write the sequel".

import { useEffect, useState } from 'react';

interface TipGoalData {
  goalAmount: number; // in cents
  goalTitle: string;
  goalDescription: string | null;
  totalTipsCents: number; // total tips received by author
}

interface Props {
  storyId: number;
  // If true, show an "Edit Goal" button for the story author
  isAuthor?: boolean;
}

export default function TipGoalWidget({ storyId, isAuthor }: Props) {
  const [data, setData] = useState<TipGoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/stories/${storyId}/tip-goal`)
      .then((r) => r.json())
      .then((d) => {
        // Only show widget if a goal has been set
        if (d.goalAmount) {
          setData(d);
          setGoalTitle(d.goalTitle ?? '');
          setGoalAmount(String((d.goalAmount / 100).toFixed(2)));
          setGoalDesc(d.goalDescription ?? '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storyId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/stories/${storyId}/tip-goal`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goalAmount: Math.round(parseFloat(goalAmount) * 100),
        goalTitle: goalTitle,
        goalDescription: goalDesc,
      }),
    });
    if (res.ok) {
      // Refresh data after saving
      const fresh = await fetch(`/api/stories/${storyId}/tip-goal`).then((r) => r.json());
      setData(fresh);
      setEditing(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    await fetch(`/api/stories/${storyId}/tip-goal`, { method: 'DELETE' });
    setData(null);
    setEditing(false);
  };

  if (loading) return null;

  // Authors can add a goal even if none is set yet
  if (!data && isAuthor) {
    return (
      <div className="border border-dashed border-gray-700 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500 mb-3">Set a tip goal to motivate readers</p>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-red-400 hover:text-red-300 font-medium transition"
        >
          + Add Tip Goal
        </button>
        {editing && (
          <GoalForm
            {...{
              goalTitle,
              setGoalTitle,
              goalAmount,
              setGoalAmount,
              goalDesc,
              setGoalDesc,
              saving,
              onSave: handleSave,
              onCancel: () => setEditing(false),
            }}
          />
        )}
      </div>
    );
  }

  if (!data) return null;

  // Calculate progress percentage (capped at 100%)
  const percent = Math.min(100, Math.round((data.totalTipsCents / data.goalAmount) * 100));
  const raised = (data.totalTipsCents / 100).toFixed(2);
  const goal = (data.goalAmount / 100).toFixed(2);

  return (
    <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-5 my-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-0.5">
            Tip Goal
          </p>
          <h4 className="text-sm font-bold text-white">{data.goalTitle}</h4>
          {data.goalDescription && (
            <p className="text-xs text-gray-400 mt-0.5">{data.goalDescription}</p>
          )}
        </div>
        {isAuthor && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-500 hover:text-gray-300 transition flex-shrink-0"
          >
            Edit
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Amounts */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>
          <span className="text-white font-semibold">${raised}</span> raised
        </span>
        <span>
          {percent}% of <span className="text-white font-semibold">${goal}</span> goal
        </span>
      </div>

      {/* Edit form */}
      {editing && (
        <GoalForm
          {...{
            goalTitle,
            setGoalTitle,
            goalAmount,
            setGoalAmount,
            goalDesc,
            setGoalDesc,
            saving,
            onSave: handleSave,
            onCancel: () => setEditing(false),
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ── Reusable edit/create form ─────────────────────────────────────────────────
function GoalForm({
  goalTitle,
  setGoalTitle,
  goalAmount,
  setGoalAmount,
  goalDesc,
  setGoalDesc,
  saving,
  onSave,
  onCancel,
  onDelete,
}: {
  goalTitle: string;
  setGoalTitle: (v: string) => void;
  goalAmount: string;
  setGoalAmount: (v: string) => void;
  goalDesc: string;
  setGoalDesc: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-gray-700 pt-4" suppressHydrationWarning>
      <input
        suppressHydrationWarning
        value={goalTitle}
        onChange={(e) => setGoalTitle(e.target.value)}
        placeholder='Goal title e.g. "Help me write Part 2!"'
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
      />
      <input
        suppressHydrationWarning
        type="number"
        value={goalAmount}
        onChange={(e) => setGoalAmount(e.target.value)}
        placeholder="Goal amount in USD (e.g. 50)"
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
      />
      <textarea
        suppressHydrationWarning
        value={goalDesc}
        onChange={(e) => setGoalDesc(e.target.value)}
        placeholder="What happens when the goal is reached? (optional)"
        rows={2}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {saving ? 'Saving...' : 'Save Goal'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-700 text-gray-400 hover:text-white text-sm rounded-lg transition"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 border border-red-800 text-red-400 hover:bg-red-900/20 text-sm rounded-lg transition"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
