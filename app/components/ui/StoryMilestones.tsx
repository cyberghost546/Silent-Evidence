'use client';
// app/components/ui/StoryMilestones.tsx
// Shown only to the story author. Displays earned milestone badges as pills.
// Fetches from /api/stories/[id]/milestones on mount.

import { useEffect, useState } from 'react';

type Milestone = { icon: string; label: string };

type Props = { storyId: number };

export default function StoryMilestones({ storyId }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    fetch(`/api/stories/${storyId}/milestones`)
      .then(r => r.json())
      .then(data => setMilestones(data.milestones ?? []))
      .catch(() => {});
  }, [storyId]);

  if (milestones.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Milestones</p>
      <div className="flex flex-wrap gap-2">
        {milestones.map((m, i) => (
          <span
            key={i}
            className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300"
          >
            <span>{m.icon}</span>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
