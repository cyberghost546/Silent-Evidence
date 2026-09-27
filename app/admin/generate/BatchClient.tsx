'use client';
// app/admin/generate/BatchClient.tsx
// Admin tool for bulk-generating AI horror stories across multiple categories at once.
// The admin selects which categories to include, how many stories per category, then
// hits "Start Batch". Stories are generated one category at a time, in sequence.
//
// Progress is streamed back from the API using Server-Sent Events (SSE) so the admin
// can watch each story being written in real time without the request timing out.
//
// Stories are published immediately (unlike the Single Story tab which saves as draft).
// The admin can hit "Stop" at any point — this sets abortRef to true, which is checked
// between each category and between each story within a category.

import { useState, useRef } from 'react';
import { Bot, Check } from 'lucide-react';

type Category = { id: number; name: string; slug: string };

// Tracks the generation state of each individual category card in the grid
type CategoryStatus = {
  status: 'idle' | 'running' | 'done' | 'error'; // current phase
  generated: number; // stories successfully created so far
  failed: number; // stories that errored out
  current?: string; // short status text shown on the card while running
};

export default function BatchClient({ categories }: { categories: Category[] }) {
  // One status entry per category, keyed by slug — all start as 'idle'
  const [statuses, setStatuses] = useState<Record<string, CategoryStatus>>(
    Object.fromEntries(categories.map((c) => [c.slug, { status: 'idle', generated: 0, failed: 0 }]))
  );
  const [running, setRunning] = useState(false); // true while the batch is active
  const [currentCat, setCurrentCat] = useState(''); // name of the category being worked on now
  const [storiesPerCat, setStoriesPerCat] = useState(18); // how many stories to generate per category
  const [selectedCats, setSelectedCats] = useState<string[]>(categories.map((c) => c.slug)); // all selected by default

  // A ref (not state) is used for the abort flag so reading it inside the async loop
  // always sees the latest value — state would be stale inside a closure
  const abortRef = useRef(false);

  // Toggle a category in/out of the selected list by clicking its card
  const toggleCat = (slug: string) => {
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // The main batch loop — runs through each selected category sequentially.
  // For each category it opens a streaming SSE connection to /api/admin/batch-generate
  // and reads progress events as they arrive, updating the UI card for that category.
  const startBatch = async () => {
    setRunning(true);
    abortRef.current = false;

    for (const cat of categories) {
      // Skip categories the admin deselected
      if (!selectedCats.includes(cat.slug)) continue;
      // Stop immediately if the admin hit the Stop button
      if (abortRef.current) break;

      setCurrentCat(cat.name);
      setStatuses((prev) => ({
        ...prev,
        [cat.slug]: { status: 'running', generated: 0, failed: 0 },
      }));

      try {
        // POST to the batch API — the response is a streaming SSE body, not a normal JSON response
        const res = await fetch('/api/admin/batch-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categorySlug: cat.slug, count: storiesPerCat }),
        });

        if (!res.ok || !res.body) {
          setStatuses((prev) => ({
            ...prev,
            [cat.slug]: { status: 'error', generated: 0, failed: storiesPerCat },
          }));
          continue;
        }

        // Read the SSE stream chunk by chunk
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = ''; // accumulates partial chunks until a full event is available

        while (true) {
          if (abortRef.current) {
            reader.cancel();
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;

          // Append the decoded chunk to the buffer and split on the SSE event delimiter (\n\n)
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          // Keep the last (possibly incomplete) chunk in the buffer for the next iteration
          buffer = lines.pop() ?? '';

          // Process each complete SSE event
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6)); // strip the "data: " prefix

              // Update the category card depending on which event type was received
              if (event.type === 'generating') {
                // A new story is being sent to Claude right now
                setStatuses((prev) => ({
                  ...prev,
                  [cat.slug]: {
                    ...prev[cat.slug],
                    status: 'running',
                    current: `Generating ${event.index}/${event.total}…`,
                  },
                }));
              } else if (event.type === 'done') {
                // One story was saved successfully — show its title
                setStatuses((prev) => ({
                  ...prev,
                  [cat.slug]: {
                    status: 'running',
                    generated: event.generated,
                    failed: event.failed,
                    current: `✓ ${event.title}`,
                  },
                }));
              } else if (event.type === 'error') {
                // One story failed — increment the failed counter but keep going
                setStatuses((prev) => ({
                  ...prev,
                  [cat.slug]: {
                    ...prev[cat.slug],
                    failed: event.failed,
                    generated: event.generated,
                  },
                }));
              } else if (event.type === 'complete') {
                // All stories for this category are done — mark the card green
                setStatuses((prev) => ({
                  ...prev,
                  [cat.slug]: { status: 'done', generated: event.generated, failed: event.failed },
                }));
              }
            } catch {} // ignore malformed event lines
          }
        }
      } catch {
        // Network error or unexpected exception for this category
        setStatuses((prev) => ({
          ...prev,
          [cat.slug]: { status: 'error', generated: 0, failed: storiesPerCat },
        }));
      }
    }

    setRunning(false);
    setCurrentCat('');
  };

  // Total stories the batch will attempt (selected categories × stories per category)
  const total = selectedCats.length * storiesPerCat;
  // Running total of successfully generated stories across all categories
  const totalGenerated = Object.values(statuses).reduce((a, s) => a + s.generated, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Batch Generate All Stories</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate {storiesPerCat} stories × {selectedCats.length} categories ={' '}
            <strong className="text-red-400">{total} stories total</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
            <label className="text-xs text-gray-400">Stories per category</label>
            <select
              value={storiesPerCat}
              onChange={(e) => setStoriesPerCat(Number(e.target.value))}
              disabled={running}
              className="bg-transparent text-white text-sm focus:outline-none"
            >
              {[3, 5, 10, 18].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {running ? (
            <button
              onClick={() => {
                abortRef.current = true;
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={startBatch}
              disabled={selectedCats.length === 0}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
            >
              <span className="inline-flex items-center gap-1.5">
                <Bot className="w-4 h-4" /> Start Batch
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Overall progress */}
      {(running || totalGenerated > 0) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {running ? `Generating: ${currentCat}` : 'Batch complete'}
            </span>
            <span className="text-red-400 font-semibold">
              {totalGenerated} / {total} stories
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? (totalGenerated / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => {
          const s = statuses[cat.slug];
          const isSelected = selectedCats.includes(cat.slug);

          return (
            <div
              key={cat.slug}
              onClick={() => !running && toggleCat(cat.slug)}
              className={`relative border rounded-xl p-4 transition cursor-pointer ${
                s.status === 'done'
                  ? 'border-red-500/50 bg-red-500/5'
                  : s.status === 'running'
                    ? 'border-red-500/60 bg-red-500/10'
                    : s.status === 'error'
                      ? 'border-red-500/50 bg-red-500/5'
                      : isSelected
                        ? 'border-gray-600 bg-gray-900/80'
                        : 'border-gray-800 bg-gray-900/40 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Checkbox */}
                    {s.status === 'idle' && (
                      <div
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'bg-red-600 border-red-500' : 'border-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                    {s.status === 'running' && (
                      <svg
                        className="w-4 h-4 text-red-400 animate-spin flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    )}
                    {s.status === 'done' && (
                      <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    {s.status === 'error' && (
                      <span className="text-red-400 text-sm flex-shrink-0">✗</span>
                    )}
                    <span className="text-sm font-medium text-white truncate">{cat.name}</span>
                  </div>

                  {/* Progress inside running */}
                  {s.status === 'running' && s.current && (
                    <p className="text-xs text-red-300 mt-1 truncate pl-6">{s.current}</p>
                  )}
                  {s.status === 'done' && (
                    <p className="text-xs text-red-400 mt-1 pl-6">
                      {s.generated} generated{s.failed > 0 ? `, ${s.failed} failed` : ''}
                    </p>
                  )}
                </div>

                {/* Mini progress bar for running */}
                {s.status === 'running' && (
                  <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{
                        width: `${storiesPerCat > 0 ? (s.generated / storiesPerCat) * 100 : 0}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Stories are published immediately • Images from Unsplash • Powered by Claude Haiku 4.5
      </p>
    </div>
  );
}
