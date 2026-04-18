'use client';
// app/story/[slug]/branch/page.tsx
// Choose Your Own Horror — interactive branching story reader.
// Fetches all nodes for the story upfront, then navigates the tree client-side
// so every choice is instant with no extra network requests.

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BranchNode {
  id: number;
  content: string;
  choiceLabel: string | null; // button label leading to this node; null = root
  isEnding: boolean;
  order: number;
  parentId: number | null;    // null = root node
}

interface StoryMeta {
  id: number;
  title: string;
  slug: string;
  author: { username: string };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BranchReader() {
  const { slug } = useParams<{ slug: string }>();

  const [story,   setStory]   = useState<StoryMeta | null>(null);
  const [nodes,   setNodes]   = useState<BranchNode[]>([]);
  const [current, setCurrent] = useState<BranchNode | null>(null);
  const [history, setHistory] = useState<BranchNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ── Fetch story meta + all branch nodes in one request ───────────────────
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/branch/by-slug/${slug}`);
        if (!res.ok) throw new Error('Story not found or has no branching paths.');
        const data: { story: StoryMeta; nodes: BranchNode[] } = await res.json();

        if (!data.nodes.length) throw new Error('This story has no branching paths yet.');
        setStory(data.story);
        setNodes(data.nodes);

        const root = data.nodes.find(n => n.parentId === null);
        if (!root) throw new Error('Story tree has no starting point.');
        setCurrent(root);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // ── Navigation ────────────────────────────────────────────────────────────

  // Children of the current node, sorted by order
  const choices = nodes
    .filter(n => n.parentId === current?.id)
    .sort((a, b) => a.order - b.order);

  const choose = useCallback((node: BranchNode) => {
    setHistory(h => [...h, current!]);
    setCurrent(node);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [current]);

  const goBack = useCallback(() => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrent(prev);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [history]);

  const restart = useCallback(() => {
    const root = nodes.find(n => n.parentId === null);
    if (root) { setCurrent(root); setHistory([]); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [nodes]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500 animate-pulse text-lg">Loading the darkness…</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-5xl">💀</div>
      <p className="text-red-400 text-lg">{error}</p>
      <Link href={`/story/${slug}`} className="text-gray-400 hover:text-white underline text-sm">
        ← Read the regular version
      </Link>
    </div>
  );

  const depth = history.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-hidden">

      {/* Atmospheric background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.07)_0%,transparent_60%)] pointer-events-none" />
      <div className="scanlines absolute inset-0 pointer-events-none opacity-[0.025]" />

      {/* Header bar */}
      <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-4">
        <Link href={`/story/${slug}`} className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Back to story
        </Link>
        <div className="text-center">
          <p className="text-xs text-red-500 font-semibold uppercase tracking-widest">Choose Your Horror</p>
          {story && <p className="text-xs text-gray-500 truncate max-w-[200px]">{story.title}</p>}
        </div>
        <div className="text-xs text-gray-600 tabular-nums">
          {depth > 0 ? `Depth ${depth}` : 'Start'}
        </div>
      </div>

      {/* Progress breadcrumb dots */}
      {depth > 0 && (
        <div className="flex items-center justify-center gap-1.5 pt-4 px-4">
          {history.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-red-800"
            />
          ))}
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Ending badge */}
        {current?.isEnding && (
          <div className="mb-6 inline-flex items-center gap-2 bg-red-950/60 border border-red-900 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider">
            <span>☠</span> The End
          </div>
        )}

        {/* Story text */}
        <div className="animate-float-up prose prose-invert prose-lg max-w-none mb-10">
          <div
            className="text-gray-200 leading-relaxed whitespace-pre-wrap text-lg"
            dangerouslySetInnerHTML={{ __html: current?.content ?? '' }}
          />
        </div>

        {/* Choices */}
        {!current?.isEnding && choices.length > 0 && (
          <div className="animate-float-up-delay-1 space-y-3">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">What do you do?</p>
            {choices.map(choice => (
              <button type="button"
                key={choice.id}
                onClick={() => choose(choice)}
                className="w-full text-left px-5 py-4 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-red-800 rounded-xl transition-all group"
              >
                <span className="text-gray-300 group-hover:text-white transition-colors text-sm leading-snug">
                  <span className="text-red-600 mr-2">›</span>
                  {choice.choiceLabel}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Ending actions */}
        {current?.isEnding && (
          <div className="animate-float-up-delay-1 flex flex-col sm:flex-row gap-3 mt-2">
            <button type="button"
              onClick={restart}
              className="flex-1 px-5 py-3 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              ↺ Start over
            </button>
            <Link
              href={`/story/${slug}`}
              className="flex-1 text-center px-5 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Read normal version
            </Link>
          </div>
        )}

        {/* No choices available (leaf node that isn't marked as ending) */}
        {!current?.isEnding && choices.length === 0 && (
          <div className="text-gray-600 text-sm italic mt-4">
            The path ends here… <button type="button" onClick={restart} className="text-red-500 hover:text-red-400 underline ml-1">Start over</button>
          </div>
        )}

        {/* Back button */}
        {history.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-800">
            <button type="button"
              onClick={goBack}
              className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
            >
              ← Go back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
