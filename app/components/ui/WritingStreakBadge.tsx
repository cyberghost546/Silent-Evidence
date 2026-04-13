// WritingStreakBadge — displays a user's current and longest writing streak.
// Shown on the profile page below the stats row.
// A streak increments each calendar day the user publishes a story.

type Props = {
  currentStreak: number;
  longestStreak: number;
};

export default function WritingStreakBadge({ currentStreak, longestStreak }: Props) {
  // Don't render anything if the user has never published
  if (currentStreak === 0 && longestStreak === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 w-fit">
      {/* Flame icon — red when active, grey when no current streak */}
      <span className={`text-2xl ${currentStreak > 0 ? '' : 'grayscale opacity-40'}`}>🔥</span>
      <div>
        <p className="text-white font-bold text-lg leading-none">
          {currentStreak} <span className="text-sm font-normal text-gray-400">day streak</span>
        </p>
        {longestStreak > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">Best: {longestStreak} days</p>
        )}
      </div>
    </div>
  );
}
