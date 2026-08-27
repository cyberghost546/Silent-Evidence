// app/components/ui/ReadingStreakBadge.tsx
// A small badge displayed on user profile pages showing how many consecutive days
// in a row they have read at least one story.
// Shows a double flame for streaks of 30+ days as a visual reward for dedication.

import { Flame } from 'lucide-react';

// currentStreak — how many consecutive days the user has read (resets if they miss a day)
// longestStreak — their all-time record, shown as a comparison hint
type Props = {
  currentStreak: number;
  longestStreak: number;
};

export default function ReadingStreakBadge({ currentStreak, longestStreak }: Props) {
  // Don't render the badge at all if the user hasn't started a streak yet
  if (currentStreak === 0) return null;

  return (
    // The `title` attribute shows a tooltip on hover with the full streak details
    <div
      title={`${currentStreak}-day reading streak (longest: ${longestStreak} days)`}
      className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-full px-3 py-1 text-xs font-semibold cursor-default"
    >
      {/* Show two flames for streaks of 30+ days — a milestone reward for very committed readers */}
      {currentStreak >= 30 ? (
        <>
          <Flame className="w-4 h-4" />
          <Flame className="w-4 h-4" />
        </>
      ) : (
        <Flame className="w-4 h-4" />
      )}
      <span>{currentStreak} day streak</span>
      {/* Only show the "best" record if they're not currently at their personal best */}
      {longestStreak > currentStreak && (
        <span className="text-orange-500/60 font-normal">· best {longestStreak}</span>
      )}
    </div>
  );
}
