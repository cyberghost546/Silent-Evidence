// app/components/ui/AuthorProgress.tsx
// Shows a writer how close they are to earning author status.
//
// Server component — the figures come from the database and nothing here is
// interactive, so it ships no client JavaScript.
//
// A milestone nobody can see the progress of is just a surprise. The whole point
// of tying the role to readership is that it gives a writer something to aim at,
// which only works if the distance is visible.

import { Feather } from 'lucide-react';
import type { AuthorProgress as Progress } from '@/lib/authorStatus';

export default function AuthorProgress({ progress }: { progress: Progress }) {
  const { reads, threshold, remaining, percent, isAuthor } = progress;

  // Already an author — celebrate it rather than showing a full bar, which
  // would read as "still in progress" at a glance.
  if (isAuthor) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4">
        <span className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Feather className="w-4 h-4 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">You&apos;re an Author</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {reads.toLocaleString()} {reads === 1 ? 'read' : 'reads'} across your published stories.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="shrink-0 w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
          <Feather className="w-4 h-4 text-gray-500" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Author status</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {remaining.toLocaleString()} more {remaining === 1 ? 'read' : 'reads'} to go.
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-gray-400">{percent}%</span>
      </div>

      <div
        className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={reads}
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-label={`${reads} of ${threshold} reads towards author status`}
      >
        <div
          className="h-full bg-amber-500 rounded-full transition-all"
          // min-width so a writer with a handful of reads still sees a sliver
          // rather than an empty bar that looks broken.
          style={{ width: percent > 0 ? `max(2px, ${percent}%)` : '0' }}
        />
      </div>

      <p className="text-xs text-gray-700 mt-2">
        {reads.toLocaleString()} of {threshold.toLocaleString()} reads · awarded automatically
      </p>
    </div>
  );
}
