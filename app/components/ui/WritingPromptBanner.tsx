'use client';
// app/components/ui/WritingPromptBanner.tsx
// Displays the current active writing prompt as a banner on the home page
// and write page. Has a "Use this prompt" button that pre-fills the story
// title input via a URL param, and shows a countdown until the prompt expires.

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Prompt = {
  id: number;
  title: string;
  prompt: string;
  expiresAt: string | null;
  _count: { entries: number };
};

// Returns a human-readable time-remaining string — e.g. "5d 3h left"
function timeLeft(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86_400_000);
  const hrs  = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hrs}h left`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
}

export default function WritingPromptBanner() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed this prompt in this session
    const key = 'se_prompt_dismissed';
    if (sessionStorage.getItem(key)) { setDismissed(true); setLoading(false); return; }

    fetch('/api/writing-prompts')
      .then(r => r.json())
      .then(data => { setPrompt(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('se_prompt_dismissed', '1');
    setDismissed(true);
  };

  if (loading || dismissed || !prompt) return null;

  // Encode the prompt text so the write page can pre-fill the excerpt field
  const writeHref = `/write?prompt=${encodeURIComponent(prompt.prompt)}&promptTitle=${encodeURIComponent(prompt.title)}`;

  return (
    <div className="relative bg-gradient-to-r from-red-950/60 to-gray-900 border-b border-red-900/40">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-start gap-4">
        {/* Quill icon */}
        <span className="text-2xl flex-shrink-0 mt-0.5">✍️</span>

        <div className="flex-1 min-w-0">
          {/* Label row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
              Weekly Writing Prompt
            </span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{prompt._count.entries} entries</span>
            {prompt.expiresAt && (
              <>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">{timeLeft(prompt.expiresAt)}</span>
              </>
            )}
          </div>

          {/* Prompt text */}
          <p className="text-sm text-gray-200 leading-relaxed">{prompt.prompt}</p>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={writeHref}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Write →
          </Link>
          <button
            onClick={dismiss}
            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-400 transition"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
