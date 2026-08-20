'use client';
// app/components/ui/StoryMilestones.tsx
// Shown only to the story author. Displays earned milestone badges as pills.
// Fetches from /api/stories/[id]/milestones on mount.

import { useEffect, useState } from 'react';
import { Eye, Heart, MessageSquare, type LucideIcon } from 'lucide-react';

type MilestoneKind = 'views' | 'likes' | 'comments';
type Milestone = { kind: MilestoneKind; label: string };

// Maps the API's semantic kind to the icon shown on the pill.
const KIND_ICONS: Record<MilestoneKind, LucideIcon> = {
  views:    Eye,
  likes:    Heart,
  comments: MessageSquare,
};

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
        {milestones.map((m, i) => {
          const Icon = KIND_ICONS[m.kind] ?? Eye;
          return (
            <span
              key={i}
              className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300"
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
              {m.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
